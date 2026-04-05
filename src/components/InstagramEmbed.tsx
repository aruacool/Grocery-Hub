import { useEffect, useRef } from 'react'

declare global {
  interface Window {
    instgrm?: { Embeds: { process: () => void } }
  }
}

function getInstagramPermalink(url: string): string | null {
  const match = url.match(/instagram\.com\/(reel|p)\/([\w-]+)/)
  if (match) {
    return `https://www.instagram.com/${match[1]}/${match[2]}/`
  }
  return null
}

export function InstagramEmbed({ url }: { url: string }) {
  const containerRef = useRef<HTMLDivElement>(null)

  const permalink = getInstagramPermalink(url)

  useEffect(() => {
    if (!permalink) return

    // Load embed.js if not already loaded
    const existingScript = document.querySelector('script[src*="instagram.com/embed.js"]')
    if (!existingScript) {
      const script = document.createElement('script')
      script.src = 'https://www.instagram.com/embed.js'
      script.async = true
      script.onload = () => {
        window.instgrm?.Embeds.process()
      }
      document.body.appendChild(script)
    } else {
      // Script already loaded, just reprocess
      setTimeout(() => {
        window.instgrm?.Embeds.process()
      }, 100)
    }
  }, [permalink])

  if (!permalink) return null

  return (
    <div ref={containerRef} className="rounded-xl overflow-hidden">
      <blockquote
        className="instagram-media"
        data-instgrm-permalink={permalink}
        data-instgrm-version="14"
        style={{
          background: '#1e293b',
          border: 0,
          borderRadius: '12px',
          margin: 0,
          maxWidth: '100%',
          minWidth: '280px',
          padding: 0,
          width: '100%',
        }}
      />
    </div>
  )
}
