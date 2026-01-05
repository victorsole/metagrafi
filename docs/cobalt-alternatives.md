# Metagrafi URL Transcription Architecture

## Current Implementation (January 2025)

Metagrafi uses **Google Cloud Run** with **yt-dlp** for URL-based transcription. This replaces the previous Supabase Edge Functions + cobalt.tools approach, which broke in November 2024.

### Architecture

```
User submits URL
       ↓
React Frontend (IONOS)
       ↓
Google Cloud Run API
       ↓
yt-dlp (extracts audio as MP3)
       ↓
OpenAI Whisper API (transcription)
       ↓
Firestore (stores result)
       ↓
Response to user
```

### Why This Architecture Works

| Component | Purpose | Why It Works |
|-----------|---------|--------------|
| **Cloud Run** | Serverless containers | 5-minute timeout, writable filesystem, can install yt-dlp + FFmpeg |
| **yt-dlp** | Audio extraction | Supports 1000+ sites, actively maintained (YouTube blocked on datacenter IPs) |
| **Firestore** | Database | NoSQL, generous free tier, auto-scaling |
| **Whisper API** | Transcription | Best-in-class accuracy, handles multiple languages |

### Supported Platforms

**Currently Working:**
- TikTok
- Instagram (Reels, Stories, IGTV)
- Twitter/X
- Facebook
- Vimeo
- SoundCloud
- Reddit
- And 1000+ more sites via yt-dlp

**Blocked:**
- **YouTube** - Google actively blocks datacenter IPs. Users must download YouTube videos locally and upload the file instead.

**Coming Soon (pending yt-dlp fixes):**
- European Parliament Multimedia (webstreaming)
- European Commission Audiovisual Service

### Cost Breakdown

| Service | Free Tier | Typical Cost |
|---------|-----------|--------------|
| Cloud Run | 2M requests/mo, 360K GB-sec | $0 for low-moderate usage |
| Firestore | 1GB storage, 50K reads/day | $0 for low-moderate usage |
| OpenAI Whisper | N/A | $0.006/minute of audio |

**Estimated monthly cost:** $0-5 for infrastructure + OpenAI usage

---

## What Happened to Cobalt.tools

On **November 11, 2024**, Cobalt's public API (`api.cobalt.tools`) was disabled due to abuse. YouTube functionality broke shortly after due to aggressive blocking from Google.

**Current status (as of January 2025):**
- YouTube: Broken on public instances
- TikTok, Instagram, Twitter: Still works on some community instances
- Self-hosting: Works if running from residential IPs

We chose yt-dlp over Cobalt because:
1. More actively maintained
2. Handles YouTube's anti-bot measures better
3. Supports more platforms
4. Can be installed directly in Cloud Run container

---

## Implementation Details

### Cloud Run Service

Located in `/cloud-run/`:

```
cloud-run/
├── Dockerfile          # Node.js 20 + yt-dlp + FFmpeg
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts        # Express server
    ├── routes/
    │   ├── transcribe-upload.ts   # File upload endpoint
    │   ├── transcribe-url.ts      # URL transcription endpoint
    │   └── admin-stats.ts         # Admin dashboard
    └── services/
        ├── firestore.ts    # Database operations
        ├── whisper.ts      # OpenAI Whisper integration
        └── ytdlp.ts        # yt-dlp wrapper
```

### yt-dlp Integration

```typescript
// cloud-run/src/services/ytdlp.ts
const cmd = `yt-dlp \
  --extract-audio \
  --audio-format mp3 \
  --audio-quality 128K \
  --max-filesize 25M \
  --no-playlist \
  "${url}"`;
```

Key flags:
- `--extract-audio`: Only download audio track
- `--audio-format mp3`: Convert to MP3 for Whisper compatibility
- `--audio-quality 128K`: Keep file size reasonable
- `--max-filesize 25M`: Respect Whisper's 25MB limit

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/transcribe-upload` | POST | File upload transcription |
| `/api/transcribe-url` | POST | URL-based transcription |
| `/api/admin-stats` | GET | Admin dashboard statistics |
| `/health` | GET | Health check |

### Environment Variables

**Cloud Run Secrets:**
- `OPENAI_API_KEY` - OpenAI API key for Whisper
- `ADMIN_SECRET` - Admin dashboard authentication

---

## Alternative Approaches (Not Currently Used)

### Commercial APIs

If yt-dlp becomes unreliable, these are backup options:

| Service | Pricing | Notes |
|---------|---------|-------|
| FastSaverAPI | RapidAPI freemium | Multi-platform support |
| Video-Download-API.com | $0.0002-0.0005/download | Transparent pricing |
| Apify | Pay-per-use ($5 free credits) | Multiple actors available |

### Self-Hosted Cobalt

Can be deployed on Railway (~$5/month) if residential IP is needed for specific platforms.

---

## Legal Considerations

Video downloading operates in legal gray areas:
- YouTube, Instagram, TikTok ToS prohibit automated downloading
- Personal/educational use may be protected under fair use
- Metagrafi's ToS places responsibility on users to have rights to submitted content
- Rate limiting is implemented to avoid appearing as a scraping operation

---

## Deployment

### Initial Deployment

```bash
cd cloud-run
npm ci && npm run build
gcloud run deploy metagrafi-api \
  --source . \
  --region europe-west1 \
  --allow-unauthenticated \
  --memory 1Gi \
  --timeout 300 \
  --set-secrets "OPENAI_API_KEY=openai-api-key:latest,ADMIN_SECRET=admin-secret:latest"
```

### CI/CD

Automatic deployment via GitHub Actions on push to `cloud-run/**`:
- `.github/workflows/deploy-cloud-run.yaml`

---

## Troubleshooting

### "Failed to download audio"
- URL might be private/restricted
- Platform might have new anti-bot measures (update yt-dlp)
- Video might be too long (>25MB after conversion)

### "Whisper API error: 429"
- OpenAI quota exceeded, add credits at platform.openai.com

### YouTube not working
**YouTube is blocked** because Google actively detects and blocks datacenter IPs. This affects all cloud providers including Google Cloud Run, AWS, Azure, etc.

**Workarounds:**
1. Users can download YouTube videos locally and upload the file
2. Use a residential proxy (expensive, complex)
3. Deploy on a VPS with residential IP (not recommended for production)

yt-dlp itself works fine - the issue is Google's bot detection, not yt-dlp's code.

### Update yt-dlp

Rebuild and redeploy Cloud Run to get latest yt-dlp:
```bash
cd cloud-run
gcloud run deploy metagrafi-api --source .
```
