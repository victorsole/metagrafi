import { useState, useRef, FormEvent, ChangeEvent } from 'react'
import Icon from '@mdi/react'
import { mdiCloudUpload } from '@mdi/js'

interface TranscriptionFormProps {
  onSubmitUrl: (url: string) => void
  onSubmitFile: (file: File) => void
  isLoading: boolean
}

export function TranscriptionForm({ onSubmitUrl, onSubmitFile, isLoading }: TranscriptionFormProps) {
  const [url, setUrl] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [inputMode, setInputMode] = useState<'url' | 'file'>('url')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleUrlSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (url.trim()) {
      onSubmitUrl(url.trim())
    }
  }

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
    }
  }

  const handleFileSubmit = () => {
    if (selectedFile) {
      onSubmitFile(selectedFile)
    }
  }

  const clearFile = () => {
    setSelectedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const isValidUrl = (urlString: string) => {
    try {
      new URL(urlString)
      return urlString.includes('youtube.com') ||
             urlString.includes('youtu.be') ||
             urlString.includes('instagram.com') ||
             urlString.includes('tiktok.com')
    } catch {
      return false
    }
  }

  return (
    <div className="w-full max-w-xl mx-auto">
      <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
        {/* Mode Toggle */}
        <div className="flex gap-2 mb-6">
          <button
            type="button"
            onClick={() => setInputMode('url')}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
              inputMode === 'url'
                ? 'bg-beresol-green text-white'
                : 'bg-beresol-cream text-beresol-black hover:bg-beresol-green/10'
            }`}
          >
            Paste URL
          </button>
          <button
            type="button"
            onClick={() => setInputMode('file')}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
              inputMode === 'file'
                ? 'bg-beresol-green text-white'
                : 'bg-beresol-cream text-beresol-black hover:bg-beresol-green/10'
            }`}
          >
            Upload File
          </button>
        </div>

        {/* URL Input Mode */}
        {inputMode === 'url' && (
          <form onSubmit={handleUrlSubmit} className="space-y-4">
            <div>
              <label htmlFor="url" className="block text-sm font-medium text-beresol-black mb-2">
                Video URL
              </label>
              <input
                type="url"
                id="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-beresol-green focus:border-transparent outline-none transition-all"
                disabled={isLoading}
              />
              <p className="mt-2 text-sm text-gray-500">
                Supports YouTube, Instagram, and TikTok links
              </p>
            </div>
            <button
              type="submit"
              disabled={isLoading || !isValidUrl(url)}
              className="w-full py-3 px-6 bg-beresol-green text-white font-semibold rounded-lg hover:bg-beresol-green-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Transcribing...' : 'Transcribe'}
            </button>
          </form>
        )}

        {/* File Upload Mode */}
        {inputMode === 'file' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-beresol-black mb-2">
                Audio/Video File
              </label>
              <div
                onClick={() => !isLoading && fileInputRef.current?.click()}
                className={`border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-beresol-green transition-colors ${
                  isLoading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".mp3,.mp4,.wav,.webm,.m4a,audio/*,video/*"
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={isLoading}
                />
                {selectedFile ? (
                  <div className="space-y-2">
                    <div className="text-beresol-green font-medium">{selectedFile.name}</div>
                    <div className="text-sm text-gray-500">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        clearFile()
                      }}
                      className="text-sm text-red-500 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="text-beresol-green flex justify-center">
                      <Icon path={mdiCloudUpload} size={2} />
                    </div>
                    <div className="text-gray-600">
                      Click to select a file
                    </div>
                    <div className="text-sm text-gray-400">
                      MP3, MP4, WAV, WebM (max 25MB)
                    </div>
                  </div>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={handleFileSubmit}
              disabled={isLoading || !selectedFile}
              className="w-full py-3 px-6 bg-beresol-green text-white font-semibold rounded-lg hover:bg-beresol-green-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Transcribing...' : 'Transcribe'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
