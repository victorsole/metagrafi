# Metagrafi Implementation Strategy

**A Beresol Transcription Service**

---

## Overview

Metagrafi (Greek for "transcription") is a free, simple transcription service that converts video and audio from YouTube, Instagram, TikTok, and uploaded files (MP3/MP4) into text. Accessible at `https://metagrafi.beresol.eu`.

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS (Beresol colours) |
| Backend | Supabase Edge Functions (Deno) |
| Transcription | OpenAI Whisper API |
| Database | Supabase PostgreSQL |
| Storage | Supabase Storage |
| Hosting | IONOS Deploy Now (frontend) + Supabase (backend) |
| Monetisation | Google AdSense |

**Why this is the simplest:**
- One project folder
- No separate backend deployment
- Supabase handles everything server-side
- Edge Functions scale automatically

---

## Project Structure

```
metagrafi/
├── src/
│   ├── components/
│   │   ├── transcription-form.tsx
│   │   ├── transcription-result.tsx
│   │   ├── loading-spinner.tsx
│   │   ├── ad-banner.tsx
│   │   └── admin-panel.tsx
│   ├── pages/
│   │   ├── home-page.tsx
│   │   └── admin-page.tsx
│   ├── hooks/
│   │   └── use-transcription.ts
│   ├── lib/
│   │   └── supabase.ts
│   ├── styles/
│   │   └── globals.css
│   ├── App.tsx
│   └── main.tsx
├── supabase/
│   ├── functions/
│   │   ├── transcribe-url/
│   │   │   └── index.ts
│   │   ├── transcribe-upload/
│   │   │   └── index.ts
│   │   └── admin-stats/
│   │       └── index.ts
│   └── migrations/
│       └── 001_create_transcriptions.sql
├── public/
│   └── beresol-logo.png
├── index.html
├── vite.config.ts
├── tailwind.config.js
├── package.json
└── README.md
```

---

## Phase 1: Project Setup

### Step 1.1: Create React Project

```bash
pnpm create vite metagrafi --template react-ts
cd metagrafi
pnpm install
pnpm add @supabase/supabase-js @tanstack/react-query
pnpm add -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### Step 1.2: Install Supabase CLI

```bash
# macOS
brew install supabase/tap/supabase

# or npm (any OS)
npm install -g supabase
```

### Step 1.3: Link to Your Supabase Project

```bash
supabase login
supabase init
supabase link --project-ref YOUR_PROJECT_REF
```

Your project ref is in your Supabase dashboard URL: `https://supabase.com/dashboard/project/YOUR_PROJECT_REF`

### Step 1.4: Environment Variables

**File: `.env.local`**

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

**File: `supabase/.env` (for Edge Functions secrets)**

```env
OPENAI_API_KEY=sk-your-openai-key
ADMIN_SECRET=your-random-secret-string
```

Set secrets in Supabase:
```bash
supabase secrets set OPENAI_API_KEY=sk-your-openai-key
supabase secrets set ADMIN_SECRET=your-random-secret-string
```

---

## Phase 2: Supabase Database Setup

### Step 2.1: Create Migration File

**File: `supabase/migrations/001_create_transcriptions.sql`**

```sql
-- Transcriptions table
CREATE TABLE transcriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    source_url TEXT,
    source_type TEXT CHECK (source_type IN ('youtube', 'instagram', 'tiktok', 'upload', 'other')),
    original_filename TEXT,
    transcription_text TEXT,
    duration_seconds INTEGER,
    language TEXT DEFAULT 'en',
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX idx_transcriptions_created_at ON transcriptions(created_at DESC);
CREATE INDEX idx_transcriptions_status ON transcriptions(status);

-- Enable RLS
ALTER TABLE transcriptions ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (public service)
CREATE POLICY "Public insert" ON transcriptions
    FOR INSERT TO anon WITH CHECK (true);

-- Allow anyone to read (to check their transcription status)
CREATE POLICY "Public read" ON transcriptions
    FOR SELECT TO anon USING (true);

-- Create storage bucket for audio uploads
INSERT INTO storage.buckets (id, name, public) 
VALUES ('audio-uploads', 'audio-uploads', false);

-- Allow anyone to upload to audio-uploads bucket
CREATE POLICY "Public upload" ON storage.objects
    FOR INSERT TO anon
    WITH CHECK (bucket_id = 'audio-uploads');

-- Allow reading uploaded files
CREATE POLICY "Public read uploads" ON storage.objects
    FOR SELECT TO anon
    USING (bucket_id = 'audio-uploads');
```

### Step 2.2: Run Migration

```bash
supabase db push
```

---

## Phase 3: Supabase Edge Functions

### Step 3.1: Create Transcribe URL Function

```bash
supabase functions new transcribe-url
```

**File: `supabase/functions/transcribe-url/index.ts`**

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { url } = await req.json()
    
    if (!url) {
      return new Response(
        JSON.stringify({ error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Detect source type
    const sourceType = detectSourceType(url)
    
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Create transcription record
    const { data: record, error: insertError } = await supabase
      .from('transcriptions')
      .insert({
        source_url: url,
        source_type: sourceType,
        status: 'processing'
      })
      .select()
      .single()

    if (insertError) throw insertError

    // Download audio using external service (cobalt.tools API - free, no auth)
    const audioUrl = await downloadAudio(url)
    
    // Transcribe with Whisper
    const transcription = await transcribeWithWhisper(audioUrl)

    // Update record with result
    const { error: updateError } = await supabase
      .from('transcriptions')
      .update({
        transcription_text: transcription,
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', record.id)

    if (updateError) throw updateError

    return new Response(
      JSON.stringify({ 
        id: record.id, 
        transcription,
        status: 'completed' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

function detectSourceType(url: string): string {
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube'
  if (url.includes('instagram.com')) return 'instagram'
  if (url.includes('tiktok.com')) return 'tiktok'
  return 'other'
}

async function downloadAudio(url: string): Promise<string> {
  // Use cobalt.tools API (free, supports YouTube/Instagram/TikTok)
  const response = await fetch('https://api.cobalt.tools/api/json', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({
      url: url,
      aFormat: 'mp3',
      isAudioOnly: true
    })
  })
  
  const data = await response.json()
  
  if (data.status === 'error') {
    throw new Error(data.text || 'Failed to download audio')
  }
  
  return data.url // Direct URL to audio file
}

async function transcribeWithWhisper(audioUrl: string): Promise<string> {
  const openaiKey = Deno.env.get('OPENAI_API_KEY')!
  
  // Download the audio file
  const audioResponse = await fetch(audioUrl)
  const audioBlob = await audioResponse.blob()
  
  // Check size - if over 25MB, we need chunking (handle in future phase)
  if (audioBlob.size > 25 * 1024 * 1024) {
    throw new Error('File too large. Maximum 25MB supported currently.')
  }

  // Create form data for Whisper API
  const formData = new FormData()
  formData.append('file', audioBlob, 'audio.mp3')
  formData.append('model', 'whisper-1')
  formData.append('language', 'en')

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiKey}`
    },
    body: formData
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Whisper API error: ${error}`)
  }

  const result = await response.json()
  return result.text
}
```

### Step 3.2: Create Transcribe Upload Function

```bash
supabase functions new transcribe-upload
```

**File: `supabase/functions/transcribe-upload/index.ts`**

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return new Response(
        JSON.stringify({ error: 'File is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check file size (25MB limit for Whisper)
    if (file.size > 25 * 1024 * 1024) {
      return new Response(
        JSON.stringify({ error: 'File too large. Maximum 25MB.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Create record
    const { data: record, error: insertError } = await supabase
      .from('transcriptions')
      .insert({
        source_type: 'upload',
        original_filename: file.name,
        status: 'processing'
      })
      .select()
      .single()

    if (insertError) throw insertError

    // Transcribe directly
    const openaiKey = Deno.env.get('OPENAI_API_KEY')!
    
    const whisperForm = new FormData()
    whisperForm.append('file', file, file.name)
    whisperForm.append('model', 'whisper-1')
    whisperForm.append('language', 'en')

    const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${openaiKey}` },
      body: whisperForm
    })

    if (!whisperResponse.ok) {
      throw new Error(`Whisper API error: ${await whisperResponse.text()}`)
    }

    const result = await whisperResponse.json()

    // Update record
    await supabase
      .from('transcriptions')
      .update({
        transcription_text: result.text,
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', record.id)

    return new Response(
      JSON.stringify({ 
        id: record.id, 
        transcription: result.text,
        status: 'completed' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
```

### Step 3.3: Create Admin Stats Function

```bash
supabase functions new admin-stats
```

**File: `supabase/functions/admin-stats/index.ts`**

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Check admin secret
    const url = new URL(req.url)
    const secret = url.searchParams.get('secret')
    const adminSecret = Deno.env.get('ADMIN_SECRET')
    
    if (secret !== adminSecret) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get stats
    const { count: totalCount } = await supabase
      .from('transcriptions')
      .select('*', { count: 'exact', head: true })

    const today = new Date().toISOString().split('T')[0]
    const { count: todayCount } = await supabase
      .from('transcriptions')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today)

    // Get recent transcriptions
    const { data: recent } = await supabase
      .from('transcriptions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)

    return new Response(
      JSON.stringify({ 
        total: totalCount,
        today: todayCount,
        transcriptions: recent
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
```

### Step 3.4: Deploy Edge Functions

```bash
supabase functions deploy transcribe-url
supabase functions deploy transcribe-upload
supabase functions deploy admin-stats
```

---

## Phase 4: Frontend Development

### Step 4.1: Tailwind Config with Beresol Colours

**File: `tailwind.config.js`**

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        beresol: {
          green: {
            DEFAULT: '#2D5016',
            light: '#4A7C23',
            dark: '#1A3009',
          },
          gold: '#8B7355',
          cream: '#F5F5DC',
          black: '#1A1A1A',
        },
      },
    },
  },
  plugins: [],
}
```

### Step 4.2: Supabase Client

**File: `src/lib/supabase.ts`**

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)

export async function transcribeUrl(url: string) {
  const response = await supabase.functions.invoke('transcribe-url', {
    body: { url }
  })
  return response.data
}

export async function transcribeFile(file: File) {
  const formData = new FormData()
  formData.append('file', file)
  
  const response = await fetch(
    `${supabaseUrl}/functions/v1/transcribe-upload`,
    {
      method: 'POST',
      body: formData,
      headers: {
        'Authorization': `Bearer ${supabaseKey}`
      }
    }
  )
  return response.json()
}

export async function getAdminStats(secret: string) {
  const response = await supabase.functions.invoke('admin-stats', {
    body: {},
    headers: {}
  })
  // Note: pass secret as query param in the actual implementation
  return response.data
}
```

### Step 4.3: Main Components to Build

**Components needed (Claude Code will implement):**

1. **`transcription-form.tsx`**: URL input + file upload button + submit
2. **`transcription-result.tsx`**: Shows text + copy button + download TXT
3. **`loading-spinner.tsx`**: Simple spinner during processing
4. **`ad-banner.tsx`**: Google AdSense container
5. **`admin-panel.tsx`**: Table of transcriptions + stats

### Step 4.4: Home Page Structure

**File: `src/pages/home-page.tsx`** (structure outline)

```
┌─────────────────────────────────────┐
│  [Beresol logo]     Metagrafi       │
│                                     │
│  Free Video & Audio Transcription   │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ Paste YouTube/Instagram/    │    │
│  │ TikTok URL or upload file   │    │
│  │                             │    │
│  │ [URL input___________]      │    │
│  │       - or -                │    │
│  │ [Choose file button]        │    │
│  │                             │    │
│  │ [Transcribe button]         │    │
│  └─────────────────────────────┘    │
│                                     │
│  [Ad banner]                        │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ Transcription result        │    │
│  │ ...                         │    │
│  │ [Copy] [Download TXT]       │    │
│  └─────────────────────────────┘    │
│                                     │
│  [Ad banner]                        │
│                                     │
│  ─────────────────────────────────  │
│  A Beresol service • beresol.eu     │
└─────────────────────────────────────┘
```

---

## Phase 5: Google AdSense Setup

### Step 5.1: Create AdSense Account

1. Go to https://www.google.com/adsense/
2. Sign up with your Google account
3. Add site: `metagrafi.beresol.eu`
4. Wait for approval (1-14 days)

### Step 5.2: Add AdSense Script

**File: `index.html`** (add in `<head>`)

```html
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXX"
     crossorigin="anonymous"></script>
```

### Step 5.3: Ad Banner Component

**File: `src/components/ad-banner.tsx`**

```typescript
import { useEffect } from 'react'

export function AdBanner() {
  useEffect(() => {
    try {
      ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({})
    } catch (e) {
      console.error('AdSense error:', e)
    }
  }, [])

  return (
    <div className="my-6">
      <ins className="adsbygoogle"
           style={{ display: 'block' }}
           data-ad-client="ca-pub-XXXXXXXX"
           data-ad-slot="XXXXXXXX"
           data-ad-format="auto"
           data-full-width-responsive="true">
      </ins>
    </div>
  )
}
```

Replace `ca-pub-XXXXXXXX` and data-ad-slot with your actual AdSense codes after approval.

---

## Phase 6: Deployment to IONOS

### Step 6.1: Build Frontend

```bash
pnpm build
```

This creates `dist/` folder with static files.

### Step 6.2: IONOS Deploy Now Setup

1. Push code to GitHub
2. In IONOS Deploy Now, connect repository
3. Configure:
   - **Build command**: `pnpm install && pnpm build`
   - **Publish directory**: `dist`
   - **Node version**: 18 or 20

### Step 6.3: Configure Subdomain

1. In IONOS DNS for `beresol.eu`
2. Add CNAME: `metagrafi` → your Deploy Now URL
3. In Deploy Now, add custom domain `metagrafi.beresol.eu`
4. Enable SSL (automatic with IONOS)

### Step 6.4: Environment Variables in IONOS

Add these in Deploy Now settings:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

---

## Phase 7: Testing Checklist

- [ ] YouTube short video URL works
- [ ] YouTube long video (under 25MB audio) works
- [ ] Instagram Reel URL works
- [ ] TikTok URL works
- [ ] MP3 upload works
- [ ] MP4 upload works
- [ ] Error shows for invalid URL
- [ ] Error shows for file over 25MB
- [ ] Copy to clipboard works
- [ ] Download TXT works
- [ ] Admin panel loads with secret
- [ ] Admin can see all transcriptions
- [ ] Google Ads display (after approval)
- [ ] Mobile responsive
- [ ] HTTPS works on metagrafi.beresol.eu

---

## Estimated Costs

| Service | Cost |
|---------|------|
| OpenAI Whisper | ~$0.006/minute of audio |
| Supabase | Free tier (500MB DB, 50K Edge Function invocations/month) |
| IONOS Deploy Now | Your existing plan |
| cobalt.tools | Free (for downloading) |

---

## Future Enhancements

1. **Multilingual**: Remove `language: 'en'` from Whisper calls (auto-detect)
2. **Large files**: Implement chunking for files over 25MB
3. **Timestamps**: Add option to include timestamps in transcription
4. **Export formats**: SRT subtitles, Word document
5. **Rate limiting**: Prevent abuse (track by IP)

---

## Implementation Order for Claude Code

1. **Phase 2**: Set up Supabase database (run migration)
2. **Phase 3**: Create and deploy Edge Functions
3. **Phase 1**: Create React project structure
4. **Phase 4**: Build frontend components
5. **Phase 6**: Deploy to IONOS
6. **Phase 5**: Add Google AdSense (after site is live)
7. **Phase 7**: Test everything

---

## Quick Start Commands

```bash
# 1. Create project
pnpm create vite metagrafi --template react-ts
cd metagrafi

# 2. Install dependencies
pnpm install
pnpm add @supabase/supabase-js @tanstack/react-query
pnpm add -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# 3. Init Supabase
supabase init
supabase link --project-ref YOUR_PROJECT_REF

# 4. Set secrets
supabase secrets set OPENAI_API_KEY=sk-xxx
supabase secrets set ADMIN_SECRET=your-secret

# 5. Push database
supabase db push

# 6. Deploy functions
supabase functions deploy transcribe-url
supabase functions deploy transcribe-upload
supabase functions deploy admin-stats

# 7. Run locally
pnpm dev
```

---

**Ready for Claude Code!** Start with the Supabase setup (Phase 2), then Edge Functions (Phase 3), then frontend (Phase 4).
