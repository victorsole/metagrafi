import { useState } from 'react'

interface TranscriptionResultProps {
  transcription: string
  onReset: () => void
}

export function TranscriptionResult({ transcription, onReset }: TranscriptionResultProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(transcription)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleDownload = () => {
    const blob = new Blob([transcription], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `transcription-${new Date().toISOString().slice(0, 10)}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const wordCount = transcription.split(/\s+/).filter(Boolean).length
  const charCount = transcription.length

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-beresol-green px-6 py-4 flex items-center justify-between">
          <h2 className="text-white font-semibold text-lg">Transcription Result</h2>
          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <button
              onClick={handleDownload}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Download TXT
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="bg-beresol-cream/30 rounded-lg p-4 max-h-96 overflow-y-auto">
            <p className="text-beresol-black whitespace-pre-wrap leading-relaxed">
              {transcription}
            </p>
          </div>

          {/* Stats */}
          <div className="mt-4 flex gap-4 text-sm text-gray-500">
            <span>{wordCount} words</span>
            <span>•</span>
            <span>{charCount} characters</span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t">
          <button
            onClick={onReset}
            className="text-beresol-green hover:text-beresol-green-dark font-medium transition-colors"
          >
            ← Transcribe another
          </button>
        </div>
      </div>
    </div>
  )
}
