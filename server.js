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

// Timing settings storage - loaded from database
let timingSettings = {
    enabled: false,
    votingStart: '2025-10-25T19:00',
    votingEnd: '2025-10-25T21:00',
    manualOverride: null
};

// Load timing settings from database
async function loadTimingSettings() {
    try {
        const settings = await database.getTimingSettings();
        timingSettings = settings;
        console.log('Timing settings loaded from database:', timingSettings);
    } catch (error) {
        console.error('Failed to load timing settings from database:', error.message);
        console.warn('Using default timing settings');
    }
}

// Initialize timing settings on startup
if (database.initialized) {
    loadTimingSettings().catch(err => {
        console.error('Error during timing settings initialization:', err);
    });
}

// Timing helper functions
// Convert a datetime-local string (YYYY-MM-DDTHH:MM) to Eastern Time Date object
function parseEasternTime(dateTimeString) {
    // datetime-local format: "2025-10-25T18:30"
    // Treat this as Eastern Time and convert to UTC Date object
    const easternTimeString = dateTimeString + ':00-04:00'; // EDT offset (October is EDT, not EST)
    return new Date(easternTimeString);
}

// Get current time in Eastern timezone
function getNowInEastern() {
    const now = new Date();
    // Convert to Eastern Time using Intl API
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });

    const parts = formatter.formatToParts(now);
    const dateObj = {};
    parts.forEach(({ type, value }) => {
        dateObj[type] = value;
    });

    // Create ISO string in Eastern Time then parse as UTC for comparison
    const easternISO = `${dateObj.year}-${dateObj.month}-${dateObj.day}T${dateObj.hour}:${dateObj.minute}:${dateObj.second}`;
    return new Date(easternISO + 'Z'); // Treat as UTC for comparison
}

function getCurrentPhase() {
    console.log('=== getCurrentPhase() Debug ===');
    console.log('timingSettings:', JSON.stringify(timingSettings, null, 2));

    if (!timingSettings.enabled) {
        console.log('Timing is DISABLED - returning disabled phase');
        return { phase: 'disabled', canVote: true, canUpload: true };
    }

    if (timingSettings.manualOverride) {
        console.log('Manual override active:', timingSettings.manualOverride);
        const phases = {
            'preshow': { phase: 'preshow', canVote: false, canUpload: true },
            'voting': { phase: 'voting', canVote: true, canUpload: true },
            'closed': { phase: 'closed', canVote: false, canUpload: false }
        };
        return phases[timingSettings.manualOverride] || phases['closed'];
    }

    // Get current time in Eastern and convert settings times to Eastern
    const now = getNowInEastern();
    const votingStart = new Date(timingSettings.votingStart + ':00Z');
    const votingEnd = new Date(timingSettings.votingEnd + ':00Z');

    console.log('Current time (Eastern as UTC):', now.toISOString());
    console.log('Voting start:', votingStart.toISOString());
    console.log('Voting end:', votingEnd.toISOString());
    console.log('now < votingStart:', now < votingStart);
    console.log('now >= votingStart && now < votingEnd:', now >= votingStart && now < votingEnd);
    console.log('now >= votingEnd:', now >= votingEnd);

    // Before voting period = pre-show (uploads allowed, voting disabled)
    if (now < votingStart) {
        console.log('RESULT: preshow phase');
        return { phase: 'preshow', canVote: false, canUpload: true };
    }
    // During voting period = voting active (uploads and voting allowed)
    else if (now >= votingStart && now < votingEnd) {
        console.log('RESULT: voting phase');
        return { phase: 'voting', canVote: true, canUpload: true };
    }
    // After voting period = closed (no uploads, no voting)
    else {
        console.log('RESULT: closed phase');
        return { phase: 'closed', canVote: false, canUpload: false };
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

app.get('/vote', async (req, res) => {
    // Reload timing settings from database to ensure we have latest values
    // This is critical in serverless environments where each request may hit a different instance
    if (database.initialized) {
        try {
            await loadTimingSettings();
        } catch (err) {
            console.warn('Failed to reload timing settings, using cached values:', err.message);
        }
    }

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

app.get('/karaoke', (req, res) => {
    res.sendFile(path.join(__dirname, 'karaoke.html'));
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

// Health check endpoint to verify environment variables
app.get('/api/health', async (req, res) => {
    let gcsTestResult = null;
    try {
        const testResult = await cloudStorage.testConnection();
        gcsTestResult = { success: testResult };
    } catch (error) {
        gcsTestResult = { success: false, error: error.message };
    }

    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        env: {
            NODE_ENV: process.env.NODE_ENV,
            VERCEL: !!process.env.VERCEL,
            SUPABASE_URL_SET: !!process.env.SUPABASE_URL,
            SUPABASE_ANON_KEY_SET: !!process.env.SUPABASE_ANON_KEY,
            GOOGLE_CLOUD_PROJECT_ID_SET: !!process.env.GOOGLE_CLOUD_PROJECT_ID,
            GOOGLE_CLOUD_BUCKET_SET: !!process.env.GOOGLE_CLOUD_BUCKET,
            GOOGLE_SERVICE_ACCOUNT_KEY_SET: !!process.env.GOOGLE_SERVICE_ACCOUNT_KEY
        },
        database: {
            initialized: database.initialized || false
        },
        googleCloudStorage: gcsTestResult
    });
});

// Git commit info endpoint for debugging
app.get('/api/version', (req, res) => {
    const { execSync } = require('child_process');
    let commitHash = 'unknown';
    let commitDate = 'unknown';
    let branch = 'unknown';

    try {
        // Get current commit hash (short version)
        commitHash = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();

        // Get commit date
        commitDate = execSync('git log -1 --format=%cd --date=short', { encoding: 'utf-8' }).trim();

        // Get current branch
        branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
    } catch (error) {
        // If git commands fail (e.g., in production without .git), try Vercel env vars
        commitHash = process.env.VERCEL_GIT_COMMIT_SHA?.substring(0, 7) || 'unknown';
        branch = process.env.VERCEL_GIT_COMMIT_REF || 'unknown';
    }

    res.json({
        commit: commitHash,
        date: commitDate,
        branch: branch,
        environment: process.env.VERCEL ? 'production' : 'development'
    });
});

// Debug endpoint to check GCS credentials decoding
app.get('/api/debug-gcs', async (req, res) => {
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
        return res.json({ error: 'GOOGLE_SERVICE_ACCOUNT_KEY not set' });
    }

    try {
        const decodedString = Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_KEY, 'base64').toString('utf-8');
        const credentialsJson = JSON.parse(decodedString);

        res.json({
            base64Length: process.env.GOOGLE_SERVICE_ACCOUNT_KEY.length,
            decodedLength: decodedString.length,
            decodedPrefix: decodedString.substring(0, 100),
            credentials: {
                type: credentialsJson.type,
                project_id: credentialsJson.project_id,
                private_key_id: credentialsJson.private_key_id,
                client_email: credentialsJson.client_email,
                client_id: credentialsJson.client_id,
                auth_uri: credentialsJson.auth_uri,
                token_uri: credentialsJson.token_uri,
                private_key_length: credentialsJson.private_key?.length,
                private_key_has_newlines: credentialsJson.private_key?.includes('\n'),
                private_key_start: credentialsJson.private_key?.substring(0, 50),
                private_key_end: credentialsJson.private_key?.substring(credentialsJson.private_key.length - 50)
            }
        });
    } catch (error) {
        res.json({
            error: error.message,
            stack: error.stack
        });
    }
});

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

// Get entry by submitter (for self-service entries)
app.get('/api/my-entry/:voterId', async (req, res) => {
    try {
        const { voterId } = req.params;
        if (!voterId) {
            return res.status(400).json({ error: 'Voter ID is required' });
        }

        const entries = await database.getEntries();
        const myEntry = entries.find(e => e.submitted_by === voterId);

        if (myEntry) {
            res.json({ success: true, entry: myEntry });
        } else {
            res.json({ success: true, entry: null });
        }
    } catch (error) {
        console.error('Error loading my entry:', error);
        res.status(500).json({ error: 'Failed to load entry' });
    }
});

// Upload image and create new contest entry
app.post('/api/upload', upload.single('photo'), async (req, res) => {
    try {
        console.log('=== Upload Request Received ===');
        console.log('Headers:', req.headers);
        console.log('Body:', req.body);
        console.log('File present:', !!req.file);

        // Reload timing settings from database to ensure we have latest values
        if (database.initialized) {
            try {
                await loadTimingSettings();
            } catch (err) {
                console.warn('Failed to reload timing settings, using cached values:', err.message);
            }
        }

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

            // In production/serverless environments, don't allow local storage fallback
            // because files in /tmp get cleaned up and images will break
            if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
                console.error('Running in production - local storage not available');
                return res.status(500).json({
                    error: 'Cloud storage upload failed',
                    details: 'Unable to upload image to cloud storage. Please check Google Cloud Storage configuration.',
                    cloudError: cloudError.message
                });
            }

            console.warn('Falling back to local storage (development only)...');

            // Fallback to local storage (development only)
            const uniqueId = crypto.randomUUID();
            const extension = path.extname(req.file.originalname);
            const filename = `${uniqueId}${extension}`;
            const filepath = path.join(uploadsDir, filename);

            fs.writeFileSync(filepath, req.file.buffer);
            imageUrl = `/uploads/${filename}`;
            console.log('Saved to local storage:', imageUrl);
        }

        // Get submitter info (if provided, for self-service entries)
        const submittedBy = req.body.submittedBy || null;

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
            uploaded_at: new Date().toISOString(),
            submitted_by: submittedBy
        };

        console.log('Saving entry to database...');
        console.log('Entry data:', JSON.stringify(newEntry, null, 2));

        try {
            const savedEntry = await database.addEntry(newEntry);
            console.log('Database save successful!');
            console.log('Saved entry:', JSON.stringify(savedEntry, null, 2));

            res.json({
                success: true,
                entry: savedEntry,
                message: 'Photo uploaded successfully!'
            });
        } catch (dbError) {
            console.error('Database save failed!');
            console.error('DB Error message:', dbError.message);
            console.error('DB Error stack:', dbError.stack);
            console.error('DB Error details:', dbError);

            // Return error to client
            throw new Error(`Failed to save to database: ${dbError.message}`);
        }

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

// Update an existing entry
app.put('/api/entries/:id', async (req, res) => {
    try {
        console.log('=== Update Entry Request ===');
        const entryId = parseInt(req.params.id);
        const updates = req.body;

        console.log('Entry ID:', entryId);
        console.log('Updates:', updates);

        // Remove fields that shouldn't be updated directly
        delete updates.id;
        delete updates.created_at;
        delete updates.votes;

        const updatedEntry = await database.updateEntry(entryId, updates);
        console.log('Entry updated successfully');

        res.json({
            success: true,
            entry: updatedEntry,
            message: 'Entry updated successfully!'
        });
    } catch (error) {
        console.error('Update entry error:', error);
        res.status(500).json({
            error: 'Failed to update entry',
            details: error.message
        });
    }
});

// Delete an entry
app.delete('/api/entries/:id', async (req, res) => {
    try {
        console.log('=== Delete Entry Request ===');
        const entryId = parseInt(req.params.id);
        console.log('Entry ID:', entryId);

        await database.deleteEntry(entryId);
        console.log('Entry deleted successfully');

        res.json({
            success: true,
            message: 'Entry deleted successfully!'
        });
    } catch (error) {
        console.error('Delete entry error:', error);
        res.status(500).json({
            error: 'Failed to delete entry',
            details: error.message
        });
    }
});

// Delete ALL entries
app.delete('/api/entries', async (req, res) => {
    try {
        console.log('=== Delete ALL Entries Request ===');

        const result = await database.deleteAllEntries();
        console.log('All entries deleted successfully:', result);

        res.json({
            success: true,
            message: `All entries deleted successfully! (${result.deletedCount} entries removed)`,
            deletedCount: result.deletedCount
        });
    } catch (error) {
        console.error('Delete all entries error:', error);
        res.status(500).json({
            error: 'Failed to delete all entries',
            details: error.message
        });
    }
});

// Serve uploaded images
app.use('/uploads', express.static(uploadsDir));

// Vote for an entry
app.post('/api/vote', async (req, res) => {
    try {
        // Reload timing settings from database to ensure we have latest values
        if (database.initialized) {
            try {
                await loadTimingSettings();
            } catch (err) {
                console.warn('Failed to reload timing settings, using cached values:', err.message);
            }
        }

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

// Get voter's votes (for costume_votes table)
app.get('/api/voter-votes/:voterId', async (req, res) => {
    try {
        const { voterId } = req.params;

        if (!voterId) {
            return res.status(400).json({ error: 'Voter ID is required' });
        }

        const votes = await database.getVoterVotes(voterId);

        res.json({
            success: true,
            votes: votes
        });
    } catch (error) {
        console.error('Get voter votes error:', error);
        res.status(500).json({ error: 'Failed to get voter votes' });
    }
});

// Submit a vote (for costume_votes table)
app.post('/api/submit-vote', async (req, res) => {
    try {
        // Reload timing settings from database to ensure we have latest values
        if (database.initialized) {
            try {
                await loadTimingSettings();
            } catch (err) {
                console.warn('Failed to reload timing settings, using cached values:', err.message);
            }
        }

        // Check timing permissions
        const currentPhase = getCurrentPhase();
        if (!currentPhase.canVote) {
            return res.status(403).json({
                error: 'Voting is not currently allowed',
                phase: currentPhase.phase,
                message: getPhaseMessage(currentPhase.phase)
            });
        }

        const { voterId, entryId, category } = req.body;

        if (!voterId || !entryId || !category) {
            return res.status(400).json({ error: 'Voter ID, entry ID, and category are required' });
        }

        // Validate category
        const validCategories = ['couple', 'funny', 'scary', 'overall'];
        if (!validCategories.includes(category)) {
            return res.status(400).json({ error: 'Invalid category' });
        }

        // Check if voter has already voted for this entry in another category
        const existingVotes = await database.getVoterVotes(voterId);
        const votedForEntryInOtherCategory = existingVotes.some(
            vote => vote.entry_id === entryId && vote.category !== category
        );

        if (votedForEntryInOtherCategory) {
            return res.status(400).json({
                error: 'You have already voted for this entry in another category. Each costume can only be voted for once.'
            });
        }

        const vote = await database.submitVote(voterId, entryId, category);

        res.json({
            success: true,
            vote: vote,
            message: 'Vote submitted!'
        });
    } catch (error) {
        console.error('Submit vote error:', error);
        res.status(500).json({ error: 'Failed to submit vote' });
    }
});

// Delete a vote (change vote in costume_votes table)
app.delete('/api/voter-vote/:voterId/:category', async (req, res) => {
    try {
        const { voterId, category } = req.params;

        if (!voterId || !category) {
            return res.status(400).json({ error: 'Voter ID and category are required' });
        }

        // Validate category
        const validCategories = ['couple', 'funny', 'scary', 'overall'];
        if (!validCategories.includes(category)) {
            return res.status(400).json({ error: 'Invalid category' });
        }

        const deleted = await database.deleteVote(voterId, category);

        res.json({
            success: true,
            deleted: deleted,
            message: 'Vote removed!'
        });
    } catch (error) {
        console.error('Delete vote error:', error);
        res.status(500).json({ error: 'Failed to delete vote' });
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
                    .map(entry => {
                        // Prefer cloud_url, fall back to image_url only if it's not a local path
                        const hasValidImage = entry.cloud_url ||
                                            (entry.image_url && !entry.image_url.startsWith('/uploads/'));

                        return {
                            id: entry.id,
                            name: entry.name,
                            type: entry.type,
                            votes: entry.votes[category],
                            avatar_type: entry.avatar_type,
                            avatarType: entry.avatar_type, // Legacy support
                            image_url: hasValidImage ? (entry.cloud_url || entry.image_url) : null,
                            cloud_url: entry.cloud_url,
                            image: hasValidImage ? (entry.cloud_url || entry.image_url) : null, // Legacy support
                            avatar: entry.avatar,
                            emoji: entry.emoji,
                            hasValidImage: hasValidImage // Flag to indicate if image is available
                        };
                    })
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
app.get('/api/timing-status', async (req, res) => {
    try {
        // Reload timing settings from database to ensure we have latest values
        // This is important in serverless environments where instances may have stale data
        if (database.initialized) {
            try {
                await loadTimingSettings();
            } catch (err) {
                console.warn('Failed to reload timing settings, using cached values:', err.message);
            }
        }

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
app.post('/api/timing-settings', async (req, res) => {
    try {
        const newSettings = req.body;
        console.log('=== Update Timing Settings Request ===');
        console.log('Received settings:', JSON.stringify(newSettings, null, 2));
        console.log('Current settings before update:', JSON.stringify(timingSettings, null, 2));

        // Validate required fields if enabled
        if (newSettings.enabled) {
            const requiredFields = ['votingStart', 'votingEnd'];
            for (const field of requiredFields) {
                if (!newSettings[field]) {
                    console.error(`Validation failed: Missing required field: ${field}`);
                    return res.status(400).json({ error: `Missing required field: ${field}` });
                }
            }

            // Validate time order (voting start must be before voting end)
            const votingStart = new Date(newSettings.votingStart + ':00Z');
            const votingEnd = new Date(newSettings.votingEnd + ':00Z');

            if (votingStart >= votingEnd) {
                console.error('Validation failed: Voting start time must be before voting end time');
                return res.status(400).json({ error: 'Voting start time must be before voting end time' });
            }
        }

        // Merge with existing settings
        const updatedSettings = { ...timingSettings, ...newSettings };
        console.log('Merged settings:', JSON.stringify(updatedSettings, null, 2));

        // Save to database
        if (!database.initialized) {
            console.error('❌ Database not initialized! Cannot persist timing settings.');
            return res.status(500).json({
                error: 'Database not initialized. Timing settings cannot be persisted.',
                details: 'Check Supabase credentials configuration'
            });
        }

        try {
            console.log('Saving to database...');
            const savedSettings = await database.updateTimingSettings(updatedSettings);
            // Update in-memory cache
            timingSettings = savedSettings;
            console.log('✅ Timing settings saved to database successfully');
            console.log('Saved settings:', JSON.stringify(timingSettings, null, 2));

            res.json({
                success: true,
                settings: timingSettings,
                currentPhase: getCurrentPhase()
            });
        } catch (dbError) {
            console.error('❌ Failed to save timing settings to database:', dbError);
            console.error('Database error details:', dbError.message);
            console.error('Database error stack:', dbError.stack);

            return res.status(500).json({
                success: false,
                error: 'Failed to save to database: ' + dbError.message,
                details: dbError.toString()
            });
        }

    } catch (error) {
        console.error('❌ Update timing settings error:', error);
        res.status(500).json({ error: 'Failed to update timing settings: ' + error.message });
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