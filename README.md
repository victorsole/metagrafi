# Metagrafi

A free, simple transcription service that converts video and audio from YouTube, Instagram, TikTok, and uploaded files (MP3/MP4) into text.

**Live at:** https://metagrafi.beresol.eu

## Features

- **URL Transcription** - Paste YouTube, Instagram, or TikTok URLs
- **File Upload** - Upload MP3, MP4, WAV, or WebM files (max 25MB)
- **Instant Results** - Copy text or download as TXT file
- **Admin Dashboard** - Usage statistics and transcription history

## Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS |
| Backend | Supabase Edge Functions (Deno) |
| Transcription | OpenAI Whisper API |
| Database | Supabase PostgreSQL |
| Hosting | IONOS Deploy Now |

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Environment Variables

Create a `.env.local` file:

```env
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Deployment

The frontend is deployed via IONOS Deploy Now. Supabase Edge Functions handle the backend.

## License

Proprietary - Beresol

---

*Metagrafi, a product of [Beresol](https://beresol.eu)*
