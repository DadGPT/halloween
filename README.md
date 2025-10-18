# 🎃 Halloween Costume Contest App

A mobile-first web application for hosting Halloween costume contests with real-time voting and photo uploads.

## Features

- 📱 **Mobile-optimized interface** with iPhone-style frame for desktop
- 📸 **Photo Upload** with Google Cloud Storage integration (fallback to local storage)
- 🗳️ **Real-time Voting** across multiple categories
- 🏆 **Contest Categories**: Best Couple, Funniest, Scariest, Best Overall
- 👥 **Admin Panel** for managing entries and viewing results
- 🌐 **Multi-device Support** for party voting

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the server:**
   ```bash
   node server.js
   ```

3. **Access the app:**
   - Welcome/Upload: http://localhost:3000/welcome
   - Voting Page: http://localhost:3000/vote
   - Admin Panel: http://localhost:3000/admin

## For Testing with Two Phones

1. **Find your local IP address:**
   ```bash
   # Windows
   ipconfig

   # Mac/Linux
   ifconfig
   ```

2. **Access from phones using your IP:**
   ```
   http://YOUR_IP_ADDRESS:3000/welcome
   http://YOUR_IP_ADDRESS:3000/vote
   ```

## Google Cloud Setup (Optional)

The app includes Google Cloud Storage integration using Pulumi for infrastructure as code.

### Prerequisites
- Google Cloud Project
- Pulumi CLI installed
- Google Cloud SDK installed

### Deploy Infrastructure

1. **Configure Pulumi:**
   ```bash
   pulumi config set gcp:project YOUR_PROJECT_ID
   pulumi config set gcp:region us-central1
   ```

2. **Deploy infrastructure:**
   ```bash
   pulumi up
   ```

3. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your Google Cloud settings
   ```

### Environment Variables

Create a `.env` file with:

```env
# Google Cloud Configuration
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_CLOUD_BUCKET=halloween-contest-images
GOOGLE_APPLICATION_CREDENTIALS=./path/to/service-account-key.json

# Server Configuration
PORT=3000
NODE_ENV=development
```

## API Endpoints

- `GET /api/entries` - Get all contest entries
- `POST /api/upload` - Upload new costume photo
- `POST /api/vote` - Cast a vote
- `GET /api/results` - Get voting results

## File Structure

```
halloween/
├── server.js              # Main server file
├── storage.js              # Google Cloud Storage service
├── welcome.html            # Photo upload page
├── index.html              # Voting interface
├── admin.html              # Admin panel
├── index.js               # Pulumi infrastructure
├── Pulumi.yaml            # Pulumi configuration
├── uploads/               # Local file storage (fallback)
└── README.md              # This file
```

## Usage Flow

1. **Welcome Page** (`/welcome`): Users upload their costume photos
2. **Voting Page** (`/vote`): Everyone votes for their favorites
3. **Admin Page** (`/admin`): View results and manage contest

## Notes

- Images are uploaded to Google Cloud Storage when configured, with fallback to local storage
- Voting data is stored in memory (use a database for production)
- The app includes sample costume entries for testing
- Mobile-first design with desktop frame simulation

## Development

The app is built with vanilla HTML/CSS/JavaScript and Node.js for simplicity and fast deployment.