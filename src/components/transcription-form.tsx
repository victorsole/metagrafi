import { useState, useRef, ChangeEvent } from 'react'
import Icon from '@mdi/react'
import { mdiCloudUpload, mdiLink, mdiInstagram, mdiAlertCircleOutline } from '@mdi/js'

interface TranscriptionFormProps {
  onSubmitFile: (file: File) => void
  onSubmitUrl: (url: string) => void
  isLoading: boolean
}

type InputMode = 'file' | 'url'

export function TranscriptionForm({ onSubmitFile, onSubmitUrl, isLoading }: TranscriptionFormProps) {
  const [mode, setMode] = useState<InputMode>('file')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [url, setUrl] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  const handleUrlSubmit = () => {
    if (url.trim()) {
      onSubmitUrl(url.trim())
    }
  }

  const clearFile = () => {
    setSelectedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const isValidUrl = (str: string) => {
    try {
      const parsed = new URL(str)
      return ['http:', 'https:'].includes(parsed.protocol)
    } catch {
      return false
    }
  }

  const getUrlPlatform = (str: string): { name: string; blocked?: boolean } | null => {
    const lower = str.toLowerCase()
    if (lower.includes('youtube.com') || lower.includes('youtu.be')) return { name: 'YouTube', blocked: true }
    if (lower.includes('instagram.com')) return { name: 'Instagram' }
    if (lower.includes('tiktok.com')) return { name: 'TikTok' }
    if (lower.includes('twitter.com') || lower.includes('x.com')) return { name: 'Twitter/X' }
    if (lower.includes('facebook.com') || lower.includes('fb.watch')) return { name: 'Facebook' }
    if (lower.includes('vimeo.com')) return { name: 'Vimeo' }
    if (lower.includes('soundcloud.com')) return { name: 'SoundCloud' }
    return null
  }

  const urlPlatform = url ? getUrlPlatform(url) : null
  const isYouTube = urlPlatform?.blocked

  return (
    <div className="w-full max-w-xl mx-auto">
      <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
        {/* Mode Tabs */}
        <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
          <button
            type="button"
            onClick={() => setMode('file')}
            disabled={isLoading}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              mode === 'file'
                ? 'bg-white text-beresol-green shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Icon path={mdiCloudUpload} size={0.8} />
            Upload File
          </button>
          <button
            type="button"
            onClick={() => setMode('url')}
            disabled={isLoading}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              mode === 'url'
                ? 'bg-white text-beresol-green shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Icon path={mdiLink} size={0.8} />
            Paste URL
          </button>
        </div>

        <div className="space-y-4">
          {mode === 'file' ? (
            /* File Upload Mode */
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
                    <div className="text-beresol-green font-medium truncate max-w-full px-2" title={selectedFile.name}>
                      {selectedFile.name.length > 40
                        ? selectedFile.name.slice(0, 20) + '...' + selectedFile.name.slice(-15)
                        : selectedFile.name}
                    </div>
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
          ) : (
            /* URL Input Mode */
            <div>
              <label className="block text-sm font-medium text-beresol-black mb-2">
                Video URL
              </label>
              <div className="relative">
                <input
                  type="url"
                  value={url || ''}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://tiktok.com/... or https://instagram.com/..."
                  disabled={isLoading}
                  className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-colors ${
                    isYouTube ? 'border-red-300 focus:border-red-400' : 'border-gray-300 focus:border-beresol-green'
                  } ${isLoading ? 'opacity-50 cursor-not-allowed bg-gray-50' : ''}`}
                />
                {urlPlatform && (
                  <div className={`absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs px-2 py-1 rounded ${
                    isYouTube ? 'text-red-600 bg-red-100' : 'text-gray-500 bg-gray-100'
                  }`}>
                    <Icon
                      path={isYouTube ? mdiAlertCircleOutline : urlPlatform.name === 'Instagram' ? mdiInstagram : mdiLink}
                      size={0.6}
                    />
                    {urlPlatform.name}
                  </div>
                )}
              </div>
              {isYouTube && (
                <div className="mt-2 text-xs text-red-600 flex items-center gap-1">
                  <Icon path={mdiAlertCircleOutline} size={0.5} />
                  YouTube is currently blocked. Please upload the file instead.
                </div>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="text-xs text-gray-400">Supported:</span>
                <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">TikTok</span>
                <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">Instagram</span>
                <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">Twitter/X</span>
                <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">Facebook</span>
                <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">Vimeo</span>
                <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">+ more</span>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={mode === 'file' ? handleFileSubmit : handleUrlSubmit}
            disabled={isLoading || (mode === 'file' ? !selectedFile : !isValidUrl(url) || isYouTube)}
            className="w-full py-3 px-6 bg-beresol-green text-white font-semibold rounded-lg hover:bg-beresol-green-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Transcribing...' : 'Transcribe'}
          </button>
        </div>
      </div>
    </div>
  )
}
