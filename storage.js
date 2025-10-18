const { Storage } = require('@google-cloud/storage');
const { GoogleAuth } = require('google-auth-library');
const path = require('path');

class CloudStorageService {
    constructor() {
        console.log('Initializing CloudStorageService...');
        console.log('Project ID:', process.env.GOOGLE_CLOUD_PROJECT_ID);
        console.log('Bucket Name:', process.env.GOOGLE_CLOUD_BUCKET);
        console.log('Has GOOGLE_SERVICE_ACCOUNT_KEY:', !!process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
        console.log('Has GOOGLE_APPLICATION_CREDENTIALS:', !!process.env.GOOGLE_APPLICATION_CREDENTIALS);

        // Initialize Google Cloud Storage
        // Support both file-based credentials (local) and JSON credentials (Vercel)
        let storageConfig = {
            projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
        };

        // Check if credentials are provided as a JSON string (for Vercel)
        if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
            try {
                console.log('Attempting to decode base64 service account key...');
                // Decode base64 and parse JSON credentials
                const credentialsJson = JSON.parse(
                    Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_KEY, 'base64').toString('utf-8')
                );

                // Log credential structure (sanitized)
                console.log('Credentials structure:', {
                    type: credentialsJson.type,
                    project_id: credentialsJson.project_id,
                    client_email: credentialsJson.client_email,
                    has_private_key: !!credentialsJson.private_key,
                    private_key_id: credentialsJson.private_key_id ? 'present' : 'missing'
                });

                // Create an explicit auth client for serverless environments
                // This prevents the "Could not load default credentials" error
                const auth = new GoogleAuth({
                    projectId: credentialsJson.project_id,
                    credentials: {
                        client_email: credentialsJson.client_email,
                        private_key: credentialsJson.private_key
                    },
                    scopes: ['https://www.googleapis.com/auth/cloud-platform']
                });

                storageConfig.authClient = auth;
                console.log('Successfully created GoogleAuth client with credentials');
            } catch (error) {
                console.error('Error parsing service account key:', error.message);
                console.error('Stack:', error.stack);
            }
        } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
            // Use file-based credentials (for local development)
            console.log('Using file-based credentials:', process.env.GOOGLE_APPLICATION_CREDENTIALS);
            storageConfig.keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS;
        } else {
            console.warn('No Google Cloud credentials configured! Upload will fail.');
        }

        console.log('Storage config being used:', {
            projectId: storageConfig.projectId,
            hasAuthClient: !!storageConfig.authClient,
            hasKeyFilename: !!storageConfig.keyFilename
        });

        this.storage = new Storage(storageConfig);
        this.bucketName = process.env.GOOGLE_CLOUD_BUCKET || 'halloween-contest-images';
        this.bucket = this.storage.bucket(this.bucketName);
        console.log('CloudStorageService initialized for bucket:', this.bucketName);
    }

    async uploadImage(file, customName = null) {
        try {
            console.log('Starting image upload...');
            console.log('File details:', {
                originalname: file.originalname,
                mimetype: file.mimetype,
                size: file.buffer?.length || 'unknown'
            });

            // Generate unique filename
            const timestamp = Date.now();
            const extension = path.extname(file.originalname);
            const filename = customName || `costume-${timestamp}${extension}`;
            console.log('Generated filename:', filename);
            console.log('Target bucket:', this.bucketName);

            // Create a reference to the file in the bucket
            const fileUpload = this.bucket.file(`uploads/${filename}`);
            console.log('Created file reference: uploads/' + filename);

            // Create a write stream
            console.log('Creating write stream...');
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
                    console.error('Upload stream error:', error.message);
                    console.error('Error code:', error.code);
                    console.error('Error stack:', error.stack);
                    reject(error);
                });

                stream.on('finish', async () => {
                    try {
                        console.log('File uploaded successfully, making it public...');
                        // Make the file publicly readable
                        await fileUpload.makePublic();
                        console.log('File made public successfully');

                        // Get the public URL
                        const publicUrl = `https://storage.googleapis.com/${this.bucketName}/uploads/${filename}`;
                        console.log('Public URL:', publicUrl);

                        resolve({
                            filename,
                            publicUrl,
                            gsUrl: `gs://${this.bucketName}/uploads/${filename}`
                        });
                    } catch (error) {
                        console.error('Error making file public:', error.message);
                        console.error('Error code:', error.code);
                        console.error('Error stack:', error.stack);
                        reject(error);
                    }
                });

                // Write the file buffer to the stream
                console.log('Writing file buffer to stream...');
                stream.end(file.buffer);
            });

        } catch (error) {
            console.error('Upload error in uploadImage:', error.message);
            console.error('Error code:', error.code);
            console.error('Error stack:', error.stack);
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
            console.log('Testing GCS bucket connection...');
            const [exists] = await this.bucket.exists();
            console.log('Bucket exists:', exists);
            if (!exists) {
                throw new Error(`Bucket ${this.bucketName} does not exist`);
            }
            return true;
        } catch (error) {
            console.error('Storage connection test failed:', error.message);
            console.error('Error code:', error.code);
            console.error('Error details:', error);
            throw error;  // Throw instead of returning false so health endpoint can show the error
        }
    }

    // Save JSON data to cloud storage
    async saveData(filename, data) {
        try {
            console.log(`Saving data to cloud storage: ${filename}`);
            console.log(`Data size: ${JSON.stringify(data).length} bytes`);
            const file = this.bucket.file(filename);
            await file.save(JSON.stringify(data, null, 2), {
                contentType: 'application/json',
                metadata: {
                    cacheControl: 'no-cache',
                },
            });
            console.log(`Data saved successfully to ${filename}`);
            return true;
        } catch (error) {
            console.error(`Save data error for ${filename}:`, error.message);
            console.error('Error code:', error.code);
            console.error('Error stack:', error.stack);
            throw error;
        }
    }

    // Load JSON data from cloud storage
    async loadData(filename) {
        try {
            console.log(`Loading data from cloud storage: ${filename}`);
            const file = this.bucket.file(filename);
            const [exists] = await file.exists();

            if (!exists) {
                console.log(`File ${filename} does not exist, returning null`);
                return null;
            }

            console.log(`File ${filename} exists, downloading...`);
            const [contents] = await file.download();
            console.log(`Downloaded ${contents.length} bytes from ${filename}`);
            const parsed = JSON.parse(contents.toString('utf-8'));
            console.log(`Parsed data successfully from ${filename}`);
            return parsed;
        } catch (error) {
            console.error(`Load data error for ${filename}:`, error.message);
            console.error('Error code:', error.code);
            console.error('Error stack:', error.stack);
            return null;
        }
    }
}

module.exports = CloudStorageService;