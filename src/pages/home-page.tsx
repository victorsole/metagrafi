import Icon from '@mdi/react'
import { mdiYoutube, mdiCellphone, mdiFileMusic, mdiAlertCircleOutline } from '@mdi/js'
import { TranscriptionForm } from '../components/transcription-form'
import { TranscriptionResult } from '../components/transcription-result'
import { LoadingSpinner } from '../components/loading-spinner'
import { AdBanner, SideAdBanner } from '../components/ad-banner'
import { Footer } from '../components/footer'
import { useTranscription } from '../hooks/use-transcription'

export function HomePage() {
  const { transcription, isLoading, error, transcribeFromUrl, transcribeFromFile, reset } = useTranscription()

  return (
    <div className="min-h-screen bg-gradient-to-b from-beresol-cream to-white flex flex-col">
      {/* Header */}
      <header className="py-8 px-4">
        <div className="max-w-4xl mx-auto flex items-center justify-center">
          <img
            src="/metagrafi-beresol.png"
            alt="Metagrafi"
            className="h-24 md:h-32 w-auto"
          />
        </div>
      </header>

      {/* Main content with side ads */}
      <div className="flex-1 flex">
        {/* Left Side Ad */}
        <aside className="hidden xl:block w-40 flex-shrink-0 px-2">
          <div className="sticky top-4">
            <SideAdBanner position="left" />
          </div>
        </aside>

        {/* Hero */}
        <main className="flex-1 px-4 pb-12">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-3xl md:text-4xl font-bold text-beresol-black mb-3">
                Free Video & Audio Transcription
              </h1>
              <p className="text-gray-600 text-lg">
                Convert YouTube, Instagram, TikTok videos or audio files to text instantly
              </p>
            </div>

            {/* Main Content */}
            {isLoading ? (
              <div className="py-12">
                <LoadingSpinner size="lg" message="Transcribing your content... This may take a moment." />
              </div>
            ) : transcription ? (
              <TranscriptionResult transcription={transcription} onReset={reset} />
            ) : (
              <>
                <TranscriptionForm
                  onSubmitUrl={transcribeFromUrl}
                  onSubmitFile={transcribeFromFile}
                  isLoading={isLoading}
                />

                {/* Error Display */}
                {error && (
                  <div className="mt-6 max-w-xl mx-auto">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
                      <div className="flex items-start gap-3">
                        <Icon path={mdiAlertCircleOutline} size={1} className="flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium">Transcription failed</p>
                          <p className="text-sm mt-1">{error}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Ad Banner */}
            <AdBanner className="max-w-xl mx-auto" />

            {/* Features */}
            <div className="mt-12 grid md:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="mb-3 text-beresol-green">
                  <Icon path={mdiYoutube} size={1.5} />
                </div>
                <h3 className="font-semibold text-lg mb-2">YouTube</h3>
                <p className="text-gray-600 text-sm">
                  Paste any YouTube video URL to get an instant transcription
                </p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="mb-3 text-beresol-green">
                  <Icon path={mdiCellphone} size={1.5} />
                </div>
                <h3 className="font-semibold text-lg mb-2">Social Media</h3>
                <p className="text-gray-600 text-sm">
                  Works with Instagram Reels and TikTok videos too
                </p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="mb-3 text-beresol-green">
                  <Icon path={mdiFileMusic} size={1.5} />
                </div>
                <h3 className="font-semibold text-lg mb-2">File Upload</h3>
                <p className="text-gray-600 text-sm">
                  Upload MP3, MP4, WAV or WebM files directly (up to 25MB)
                </p>
              </div>
            </div>

            {/* Second Ad Banner */}
            <AdBanner className="max-w-xl mx-auto" />
          </div>
        </main>

        {/* Right Side Ad */}
        <aside className="hidden xl:block w-40 flex-shrink-0 px-2">
          <div className="sticky top-4">
            <SideAdBanner position="right" />
          </div>
        </aside>
      </div>

      <Footer />
    </div>
  )
}
