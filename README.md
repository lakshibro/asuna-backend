# Asuna Backend

The Node.js/Express backend powering the Asuna ecosystem. It acts as the central hub for processing browser history, generating daily diary entries, analyzing user interests, and curating magazine content using Google Gemini AI.

## Features

- **History Sync**: Receives and processes synced browser history from the Chrome extension.
- **Diary Generation**: Uses Gemini to summarize daily activities into a narrative diary.
- **Interest Analysis**: Analyzes browsing patterns to map out fields of interest and knowledge depth.
- **Magazine/Content Discovery**: Curates personalized reading lists and content based on user interests.
- **Recall/Knowledge Graph (Second Brain)**: (In development) Semantic search and vector storage for past interactions and knowledge.
- **Automated Tasks**: Uses `node-cron` for scheduled generation of diaries and magazines.

## Prerequisites

- Node.js (v18+)
- Google Gemini API Key

## Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Variables**
   Copy the example environment file and add your actual API keys:
   ```bash
   cp .env.example .env
   ```
   Edit `.env`:
   ```env
   PORT=3848
   GEMINI_API_KEY=your_gemini_api_key
   ```

3. **Run the Server**
   ```bash
   npm start
   ```
   For development with auto-reloading:
   ```bash
   npm run dev
   ```

## API Structure

- `POST /api/history/sync` - Syncs recent browsing history.
- `GET /api/diary` - Fetches the latest diary entry.
- `POST /api/diary/generate` - Manually triggers diary generation.
- `GET /api/interests` - Fetches the user's analyzed interests.
- `POST /api/interests/analyze` - Manually triggers interest analysis.
- `GET /api/magazine` - Fetches curated content.
- `POST /api/magazine/generate` - Manually triggers magazine generation.
- `GET /api/recall/search` - Searches the knowledge graph.

## Deployment

Designed to be hosted alongside the `whatsapp-ai-bot` on a DigitalOcean Droplet using PM2. See the main `ASUNA_README.md` for ecosystem architecture and deployment strategies.
