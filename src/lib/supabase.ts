import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const isConfigured = Boolean(supabaseUrl && supabaseKey)

if (!isConfigured) {
  console.warn('Supabase credentials not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local')
}

// Create a mock client for development without credentials
export const supabase: SupabaseClient = isConfigured
  ? createClient(supabaseUrl, supabaseKey)
  : createClient('https://placeholder.supabase.co', 'placeholder-key')

export interface TranscriptionResult {
  id: string
  transcription: string
  status: 'completed' | 'failed' | 'processing'
  error?: string
}

export interface TranscriptionRecord {
  id: string
  source_url: string | null
  source_type: 'youtube' | 'instagram' | 'tiktok' | 'upload' | 'other'
  original_filename: string | null
  transcription_text: string | null
  duration_seconds: number | null
  language: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  error_message: string | null
  created_at: string
  completed_at: string | null
}

export interface AdminStats {
  total: number
  today: number
  completed: number
  failed: number
  bySource: Record<string, number>
  transcriptions: TranscriptionRecord[]
}

export async function transcribeUrl(url: string): Promise<TranscriptionResult> {
  const response = await supabase.functions.invoke('transcribe-url', {
    body: { url }
  })

  if (response.error) {
    throw new Error(response.error.message)
  }

  return response.data
}

export async function transcribeFile(file: File): Promise<TranscriptionResult> {
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

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || 'Failed to transcribe file')
  }

  return response.json()
}

export async function getAdminStats(secret: string): Promise<AdminStats> {
  const response = await fetch(
    `${supabaseUrl}/functions/v1/admin-stats?secret=${encodeURIComponent(secret)}`,
    {
      headers: {
        'Authorization': `Bearer ${supabaseKey}`
      }
    }
  )

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || 'Failed to fetch admin stats')
  }

  return response.json()
}
