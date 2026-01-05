import { useEffect } from 'react'

interface AdBannerProps {
  slot?: string
  format?: 'auto' | 'horizontal' | 'vertical' | 'rectangle'
  className?: string
}

interface SideAdBannerProps {
  slot?: string
  position: 'left' | 'right'
}

declare global {
  interface Window {
    adsbygoogle: unknown[]
  }
}

export function AdBanner({ slot = 'XXXXXXXX', format = 'auto', className = '' }: AdBannerProps) {
  const isDev = import.meta.env.DEV

  useEffect(() => {
    if (isDev) return // Don't load ads in development
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({})
    } catch (e) {
      console.error('AdSense error:', e)
    }
  }, [isDev])

  // In development, show a placeholder
  if (isDev) {
    return (
      <div className={`my-6 ${className}`}>
        <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <p className="text-gray-500 text-sm">
            Ad placeholder
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={`my-6 ${className}`}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client="ca-pub-8238362660579323"
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  )
}

export function SideAdBanner({ slot = 'XXXXXXXX', position }: SideAdBannerProps) {
  const isDev = import.meta.env.DEV

  useEffect(() => {
    if (isDev) return // Don't load ads in development
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({})
    } catch (e) {
      console.error('AdSense error:', e)
    }
  }, [isDev])

  // In development, show a placeholder
  if (isDev) {
    return (
      <div className="w-full">
        <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-4 text-center min-h-[600px] flex items-center justify-center">
          <p className="text-gray-400 text-xs writing-mode-vertical">
            {position === 'left' ? 'Left' : 'Right'} Ad
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client="ca-pub-8238362660579323"
        data-ad-slot={slot}
        data-ad-format="vertical"
      />
    </div>
  )
}
