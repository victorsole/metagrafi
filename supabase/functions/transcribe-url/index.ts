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
      JSON.stringify({ error: (error as Error).message }),
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
