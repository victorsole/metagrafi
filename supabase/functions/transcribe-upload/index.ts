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

    const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${openaiKey}` },
      body: whisperForm
    })

    if (!whisperResponse.ok) {
      const errorText = await whisperResponse.text()
      // Update record with error
      await supabase
        .from('transcriptions')
        .update({
          status: 'failed',
          error_message: errorText
        })
        .eq('id', record.id)
      throw new Error(`Whisper API error: ${errorText}`)
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
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
