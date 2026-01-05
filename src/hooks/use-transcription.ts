import { useState, useCallback } from 'react'
import { transcribeUrl, transcribeFile, TranscriptionResult } from '../lib/api'

interface UseTranscriptionReturn {
  transcription: string | null
  isLoading: boolean
  error: string | null
  transcribeFromUrl: (url: string) => Promise<void>
  transcribeFromFile: (file: File) => Promise<void>
  reset: () => void
}

export function useTranscription(): UseTranscriptionReturn {
  const [transcription, setTranscription] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const transcribeFromUrl = useCallback(async (url: string) => {
    setIsLoading(true)
    setError(null)
    setTranscription(null)

    try {
      const result: TranscriptionResult = await transcribeUrl(url)
      if (result.status === 'completed') {
        setTranscription(result.transcription)
      } else if (result.status === 'failed') {
        setError(result.error || 'Transcription failed')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const transcribeFromFile = useCallback(async (file: File) => {
    setIsLoading(true)
    setError(null)
    setTranscription(null)

    // Validate file type
    const validTypes = ['audio/mpeg', 'audio/mp3', 'audio/mp4', 'video/mp4', 'audio/wav', 'audio/webm']
    if (!validTypes.includes(file.type) && !file.name.match(/\.(mp3|mp4|wav|webm|m4a)$/i)) {
      setError('Invalid file type. Please upload an MP3, MP4, WAV, or WebM file.')
      setIsLoading(false)
      return
    }

    // Validate file size (25MB limit)
    const maxSize = 25 * 1024 * 1024
    if (file.size > maxSize) {
      setError('File too large. Maximum file size is 25MB.')
      setIsLoading(false)
      return
    }

    try {
      const result: TranscriptionResult = await transcribeFile(file)
      if (result.status === 'completed') {
        setTranscription(result.transcription)
      } else if (result.status === 'failed') {
        setError(result.error || 'Transcription failed')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const reset = useCallback(() => {
    setTranscription(null)
    setError(null)
    setIsLoading(false)
  }, [])

  return {
    transcription,
    isLoading,
    error,
    transcribeFromUrl,
    transcribeFromFile,
    reset
  }
}
