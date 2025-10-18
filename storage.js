const { Storage } = require('@google-cloud/storage');
const path = require('path');

class CloudStorageService {
    constructor() {
        // Initialize Google Cloud Storage
        // Support both file-based credentials (local) and JSON credentials (Vercel)
        let storageConfig = {
            projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
        };

        // Check if credentials are provided as a JSON string (for Vercel)
        if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
            try {
                // Decode base64 and parse JSON credentials
                const credentials = JSON.parse(
                    Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_KEY, 'base64').toString('utf-8')
                );
                storageConfig.credentials = credentials;
            } catch (error) {
                console.error('Error parsing service account key:', error);
            }
        } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
            // Use file-based credentials (for local development)
            storageConfig.keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS;
        }

        this.storage = new Storage(storageConfig);
        this.bucketName = process.env.GOOGLE_CLOUD_BUCKET || 'halloween-contest-images';
        this.bucket = this.storage.bucket(this.bucketName);
    }

    async uploadImage(file, customName = null) {
        try {
            // Generate unique filename
            const timestamp = Date.now();
            const extension = path.extname(file.originalname);
            const filename = customName || `costume-${timestamp}${extension}`;

            // Create a reference to the file in the bucket
            const fileUpload = this.bucket.file(`uploads/${filename}`);

            // Create a write stream
            const stream = fileUpload.createWriteStream({
                metadata: {
                    contentType: file.mimetype,
                    metadata: {
                        originalName: file.originalname,
                        uploadedAt: new Date().toISOString(),
                    }
                },
                resumable: false, // Use simple upload for small files
            });

            return new Promise((resolve, reject) => {
                stream.on('error', (error) => {
                    console.error('Upload stream error:', error);
                    reject(error);
                });

                stream.on('finish', async () => {
                    try {
                        // Make the file publicly readable
                        await fileUpload.makePublic();

                        // Get the public URL
                        const publicUrl = `https://storage.googleapis.com/${this.bucketName}/uploads/${filename}`;

                        resolve({
                            filename,
                            publicUrl,
                            gsUrl: `gs://${this.bucketName}/uploads/${filename}`
                        });
                    } catch (error) {
                        console.error('Error making file public:', error);
                        reject(error);
                    }
                });

                // Write the file buffer to the stream
                stream.end(file.buffer);
            });

        } catch (error) {
            console.error('Upload error:', error);
            throw error;
        }
    }

    async deleteImage(filename) {
        try {
            const file = this.bucket.file(`uploads/${filename}`);
            await file.delete();
            return true;
        } catch (error) {
            console.error('Delete error:', error);
            throw error;
        }
    }

    async listImages() {
        try {
            const [files] = await this.bucket.getFiles({ prefix: 'uploads/' });
            return files.map(file => ({
                name: file.name,
                publicUrl: `https://storage.googleapis.com/${this.bucketName}/${file.name}`,
                created: file.metadata.timeCreated,
                size: file.metadata.size,
            }));
        } catch (error) {
            console.error('List error:', error);
            throw error;
        }
    }

    // Health check method
    async testConnection() {
        try {
            await this.bucket.exists();
            return true;
        } catch (error) {
            console.error('Storage connection test failed:', error);
            return false;
        }
    }

    // Save JSON data to cloud storage
    async saveData(filename, data) {
        try {
            const file = this.bucket.file(filename);
            await file.save(JSON.stringify(data, null, 2), {
                contentType: 'application/json',
                metadata: {
                    cacheControl: 'no-cache',
                },
            });
            console.log(`Data saved to ${filename}`);
            return true;
        } catch (error) {
            console.error('Save data error:', error);
            throw error;
        }
    }

    // Load JSON data from cloud storage
    async loadData(filename) {
        try {
            const file = this.bucket.file(filename);
            const [exists] = await file.exists();

            if (!exists) {
                console.log(`File ${filename} does not exist, returning null`);
                return null;
            }

            const [contents] = await file.download();
            return JSON.parse(contents.toString('utf-8'));
        } catch (error) {
            console.error('Load data error:', error);
            return null;
        }
    }
}

module.exports = CloudStorageService;