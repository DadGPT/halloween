const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const CloudStorageService = require('./storage');
const DatabaseService = require('./database');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize cloud storage service (for images)
const cloudStorage = new CloudStorageService();

// Initialize database service (for contest data)
let database;
try {
    database = new DatabaseService();
    console.log('Database service initialized successfully');
} catch (error) {
    console.error('Failed to initialize database service:', error.message);
    console.error('Database functionality will not be available');
    // Create a mock database that returns errors
    database = {
        getEntries: async () => { throw new Error('Database not initialized'); },
        addEntry: async () => { throw new Error('Database not initialized'); },
        addVote: async () => { throw new Error('Database not initialized'); },
        removeVote: async () => { throw new Error('Database not initialized'); },
        resetVotes: async () => { throw new Error('Database not initialized'); }
    };
}

// Enable CORS for all origins (you may want to restrict this in production)
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Create uploads directory if it doesn't exist
// In serverless environments (like Vercel), use /tmp for writable storage
const uploadsDir = process.env.VERCEL ? '/tmp/uploads' : path.join(__dirname, 'uploads');
try {
    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
        console.log('Created uploads directory:', uploadsDir);
    }
} catch (error) {
    console.warn('Could not create uploads directory (read-only filesystem?):', error.message);
    console.warn('Local file uploads will not work, relying on cloud storage only');
}

// Configure multer for file uploads (store in memory for cloud upload)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: function (req, file, cb) {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'), false);
        }
    }
});

// Note: Contest entries are now stored in Supabase database
// No in-memory storage needed - database handles persistence

// Timing settings storage
let timingSettings = {
    enabled: false,
    preShowStart: '2024-10-25T18:30',
    preShowEnd: '2024-10-25T19:45',
    votingStart: '2024-10-25T19:45',
    votingEnd: '2024-10-25T20:15',
    postVotingStart: '2024-10-25T20:15',
    resultsTime: '2024-10-25T20:30',
    manualOverride: null
};

// Timing helper functions
function getCurrentPhase() {
    if (!timingSettings.enabled) {
        return { phase: 'disabled', canVote: true, canUpload: true };
    }

    if (timingSettings.manualOverride) {
        const phases = {
            'preshow': { phase: 'preshow', canVote: false, canUpload: true },
            'voting': { phase: 'voting', canVote: true, canUpload: true },
            'closed': { phase: 'closed', canVote: false, canUpload: false }
        };
        return phases[timingSettings.manualOverride] || phases['closed'];
    }

    const now = new Date();
    const preShowStart = new Date(timingSettings.preShowStart);
    const preShowEnd = new Date(timingSettings.preShowEnd);
    const votingStart = new Date(timingSettings.votingStart);
    const votingEnd = new Date(timingSettings.votingEnd);
    const postVotingStart = new Date(timingSettings.postVotingStart);
    const resultsTime = new Date(timingSettings.resultsTime);

    if (now < preShowStart) {
        return { phase: 'beforeshow', canVote: false, canUpload: false };
    } else if (now >= preShowStart && now < preShowEnd) {
        return { phase: 'preshow', canVote: false, canUpload: true };
    } else if (now >= votingStart && now < votingEnd) {
        return { phase: 'voting', canVote: true, canUpload: true };
    } else if (now >= postVotingStart && now < resultsTime) {
        return { phase: 'closed', canVote: false, canUpload: false };
    } else {
        return { phase: 'results', canVote: false, canUpload: false };
    }
}

function getPhaseMessage(phase) {
    const messages = {
        'beforeshow': 'The contest hasn\'t started yet. Check back at 6:30 PM!',
        'preshow': 'Pre-show period: You can upload costumes but voting hasn\'t started yet. Voting begins at 7:45 PM!',
        'voting': 'Voting is now ACTIVE! Cast your votes for your favorite costumes.',
        'closed': 'Voting has ended. Results will be announced at 8:30 PM!',
        'results': 'Contest complete! Thank you for participating. Winners have been announced!'
    };
    return messages[phase] || 'Contest status unknown';
}

// Routes

// Serve static HTML files
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'welcome.html'));
});

app.get('/welcome', (req, res) => {
    res.sendFile(path.join(__dirname, 'welcome.html'));
});

app.get('/vote', (req, res) => {
    // Check current phase and redirect if necessary
    const currentPhase = getCurrentPhase();

    if (currentPhase.phase === 'beforeshow' || currentPhase.phase === 'preshow') {
        return res.redirect('/preshow');
    } else if (currentPhase.phase === 'closed' || currentPhase.phase === 'results') {
        return res.redirect('/voting-closed');
    }

    // If voting is allowed or timing is disabled, show voting page
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

app.get('/thank-you', (req, res) => {
    res.sendFile(path.join(__dirname, 'thank-you.html'));
});

app.get('/preshow', (req, res) => {
    res.sendFile(path.join(__dirname, 'preshow.html'));
});

app.get('/voting-closed', (req, res) => {
    res.sendFile(path.join(__dirname, 'voting-closed.html'));
});

// API Routes

// Get all contest entries
app.get('/api/entries', async (req, res) => {
    try {
        const entries = await database.getEntries();
        res.json(entries);
    } catch (error) {
        console.error('Error loading entries:', error);
        res.status(500).json({ error: 'Failed to load entries' });
    }
});

// Upload image and create new contest entry
app.post('/api/upload', upload.single('photo'), async (req, res) => {
    try {
        console.log('=== Upload Request Received ===');
        console.log('Headers:', req.headers);
        console.log('Body:', req.body);
        console.log('File present:', !!req.file);

        // Check timing permissions
        const currentPhase = getCurrentPhase();
        if (!currentPhase.canUpload) {
            console.log('Upload rejected: phase not allowing uploads');
            return res.status(403).json({
                error: 'Costume uploads are not currently allowed',
                phase: currentPhase.phase,
                message: getPhaseMessage(currentPhase.phase)
            });
        }

        if (!req.file) {
            console.error('No file in request');
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const { name, description = '', type = 'individual' } = req.body;

        if (!name || name.trim() === '') {
            console.error('Name is missing or empty');
            return res.status(400).json({ error: 'Name is required' });
        }

        console.log('Processing upload for:', name);

        let imageUrl;
        let uploadResult;

        try {
            console.log('Attempting cloud storage upload...');
            // Try to upload to Google Cloud Storage first
            uploadResult = await cloudStorage.uploadImage(req.file);
            imageUrl = uploadResult.publicUrl;
            console.log('Image uploaded to Google Cloud successfully:', uploadResult);
        } catch (cloudError) {
            console.error('Cloud upload failed:', cloudError.message);
            console.error('Cloud error stack:', cloudError.stack);
            console.error('Cloud error code:', cloudError.code);
            console.warn('Falling back to local storage...');

            // Fallback to local storage
            const uniqueId = crypto.randomUUID();
            const extension = path.extname(req.file.originalname);
            const filename = `${uniqueId}${extension}`;
            const filepath = path.join(uploadsDir, filename);

            fs.writeFileSync(filepath, req.file.buffer);
            imageUrl = `/uploads/${filename}`;
            console.log('Saved to local storage:', imageUrl);
        }

        // Create new contest entry
        const newEntry = {
            id: Date.now(), // Simple ID generation
            name: name.trim(),
            description: description.trim(),
            type: type,
            avatar_type: 'image',
            image_url: imageUrl,
            cloud_url: uploadResult?.publicUrl || null,
            votes: { couple: 0, funny: 0, scary: 0, overall: 0 },
            uploaded_at: new Date().toISOString()
        };

        console.log('Saving entry to database...');
        const savedEntry = await database.addEntry(newEntry);

        console.log('Upload successful!');
        res.json({
            success: true,
            entry: savedEntry,
            message: 'Photo uploaded successfully!'
        });

    } catch (error) {
        console.error('=== Upload Error ===');
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        console.error('Error code:', error.code);

        res.status(500).json({
            error: 'Upload failed',
            details: error.message,
            code: error.code
        });
    }
});

// Serve uploaded images
app.use('/uploads', express.static(uploadsDir));

// Vote for an entry
app.post('/api/vote', async (req, res) => {
    try {
        // Check timing permissions
        const currentPhase = getCurrentPhase();
        if (!currentPhase.canVote) {
            return res.status(403).json({
                error: 'Voting is not currently allowed',
                phase: currentPhase.phase,
                message: getPhaseMessage(currentPhase.phase)
            });
        }

        const { entryId, category } = req.body;

        if (!entryId || !category) {
            return res.status(400).json({ error: 'Entry ID and category are required' });
        }

        // Validate category
        const validCategories = ['couple', 'funny', 'scary', 'overall'];
        if (!validCategories.includes(category)) {
            return res.status(400).json({ error: 'Invalid category' });
        }

        const entry = await database.addVote(entryId, category);

        res.json({
            success: true,
            entry: entry,
            message: 'Vote recorded!'
        });

    } catch (error) {
        console.error('Vote error:', error);
        res.status(500).json({ error: 'Vote failed' });
    }
});

// Get voting results
app.get('/api/results', async (req, res) => {
    try {
        const entries = await database.getEntries();

        const results = {
            couple: entries.filter(e => e.type === 'couple').sort((a, b) => b.votes.couple - a.votes.couple),
            funny: [...entries].sort((a, b) => b.votes.funny - a.votes.funny),
            scary: [...entries].sort((a, b) => b.votes.scary - a.votes.scary),
            overall: [...entries].sort((a, b) => b.votes.overall - a.votes.overall)
        };

        res.json(results);
    } catch (error) {
        console.error('Error getting results:', error);
        res.status(500).json({ error: 'Failed to get results' });
    }
});

// Remove a single vote from an entry
app.post('/api/remove-vote', async (req, res) => {
    try {
        const { entryId, category } = req.body;

        if (!entryId || !category) {
            return res.status(400).json({ error: 'Entry ID and category are required' });
        }

        // Validate category
        const validCategories = ['couple', 'funny', 'scary', 'overall'];
        if (!validCategories.includes(category)) {
            return res.status(400).json({ error: 'Invalid category' });
        }

        const entry = await database.removeVote(entryId, category);

        res.json({
            success: true,
            entry: entry,
            message: 'Vote removed!'
        });

    } catch (error) {
        console.error('Remove vote error:', error);
        res.status(500).json({ error: 'Remove vote failed' });
    }
});

// Reset all votes
app.post('/api/reset-votes', async (req, res) => {
    try {
        await database.resetVotes();

        const entries = await database.getEntries();

        res.json({
            success: true,
            message: 'All votes reset!',
            entries: entries
        });

    } catch (error) {
        console.error('Reset votes error:', error);
        res.status(500).json({ error: 'Reset votes failed' });
    }
});

// Get detailed vote statistics
app.get('/api/vote-stats', async (req, res) => {
    try {
        const entries = await database.getEntries();

        const stats = {
            categories: ['couple', 'funny', 'scary', 'overall'].map(category => {
                const categoryEntries = category === 'couple'
                    ? entries.filter(e => e.type === 'couple')
                    : entries;

                const totalVotes = categoryEntries.reduce((sum, entry) => sum + entry.votes[category], 0);
                const sortedEntries = categoryEntries
                    .map(entry => ({
                        id: entry.id,
                        name: entry.name,
                        type: entry.type,
                        votes: entry.votes[category],
                        avatar_type: entry.avatar_type,
                        image_url: entry.image_url,
                        avatar: entry.avatar
                    }))
                    .sort((a, b) => b.votes - a.votes);

                return {
                    category,
                    totalVotes,
                    entries: sortedEntries
                };
            }),
            totalEntries: entries.length,
            grandTotalVotes: entries.reduce((sum, entry) => {
                return sum + Object.values(entry.votes).reduce((s, v) => s + v, 0);
            }, 0)
        };

        res.json(stats);

    } catch (error) {
        console.error('Vote stats error:', error);
        res.status(500).json({ error: 'Failed to get vote statistics' });
    }
});

// Timing settings endpoints

// Get current timing settings and phase
app.get('/api/timing-status', (req, res) => {
    try {
        const currentPhase = getCurrentPhase();
        res.json({
            settings: timingSettings,
            currentPhase: currentPhase
        });
    } catch (error) {
        console.error('Timing status error:', error);
        res.status(500).json({ error: 'Failed to get timing status' });
    }
});

// Update timing settings
app.post('/api/timing-settings', (req, res) => {
    try {
        const newSettings = req.body;

        // Validate required fields if enabled
        if (newSettings.enabled) {
            const requiredFields = ['preShowStart', 'preShowEnd', 'votingStart', 'votingEnd', 'postVotingStart', 'resultsTime'];
            for (const field of requiredFields) {
                if (!newSettings[field]) {
                    return res.status(400).json({ error: `Missing required field: ${field}` });
                }
            }

            // Validate time order
            const times = [
                new Date(newSettings.preShowStart),
                new Date(newSettings.preShowEnd),
                new Date(newSettings.votingStart),
                new Date(newSettings.votingEnd),
                new Date(newSettings.postVotingStart),
                new Date(newSettings.resultsTime)
            ];

            for (let i = 0; i < times.length - 1; i++) {
                if (times[i] >= times[i + 1]) {
                    return res.status(400).json({ error: 'Times must be in chronological order' });
                }
            }
        }

        // Update settings
        timingSettings = { ...timingSettings, ...newSettings };
        console.log('Timing settings updated:', timingSettings);

        res.json({
            success: true,
            settings: timingSettings,
            currentPhase: getCurrentPhase()
        });

    } catch (error) {
        console.error('Update timing settings error:', error);
        res.status(500).json({ error: 'Failed to update timing settings' });
    }
});

// Error handling middleware
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'File too large. Maximum size is 5MB.' });
        }
    }

    console.error('Server error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
});

// Start server (only if not running in serverless environment)
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`🎃 Halloween Contest Server running on http://localhost:${PORT}`);
        console.log(`📱 Welcome page: http://localhost:${PORT}/welcome`);
        console.log(`🗳️  Voting page: http://localhost:${PORT}/vote`);
        console.log(`🔧 Admin page: http://localhost:${PORT}/admin`);
    });
}

module.exports = app;