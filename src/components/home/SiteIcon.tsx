import { useState, type CSSProperties } from 'react'
import { IconByName } from '../../lib/icons'
import type { NavSite } from '../../types/navigation'

interface SiteIconProps {
  site: Pick<NavSite, 'icon' | 'iconUrl' | 'name' | 'url'>
  autoFaviconEnabled?: boolean
}

const palette = ['#6c63ff', '#10a37f', '#d97706', '#0ea5e9', '#ec4899', '#f59e0b', '#8b5cf6', '#14b8a6', '#ef4444', '#3b82f6', '#06b6d4', '#84cc16']

function hashText(value: string) {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0
  }
  return Math.abs(hash)
}

function hostOf(url: string) {
  try {
    return new URL(url).hostname
  } catch {
    return ''
  }
}

function looksLikeEmoji(value: string) {
  return /[^\w\s-]/u.test(value.trim())
}

export function SiteIcon({ site, autoFaviconEnabled = false }: SiteIconProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const [failedFavicon, setFailedFavicon] = useState<string | null>(null)
  const iconUrl = site.iconUrl?.trim()
  const domain = hostOf(site.url)
  const faviconUrl = domain ? `https://favicon.im/${domain}?larger=true` : ''
  const showImage = !!iconUrl && failedUrl !== iconUrl
  const manualIcon = site.icon.trim()
  const hasManualIcon = !!manualIcon && manualIcon !== 'Sparkles'
  const showFavicon = !showImage && !hasManualIcon && autoFaviconEnabled && !!faviconUrl && failedFavicon !== faviconUrl
  const color = palette[hashText(site.name) % palette.length]
  const initial = site.name.trim().slice(0, 1).toUpperCase() || '✦'

  return (
    <span className="site-icon" aria-hidden="true" style={{ '--site-icon-color': color } as CSSProperties}>
      {showImage ? (
        <img
          alt=""
          className="site-icon-img"
          loading="lazy"
          src={iconUrl}
          onError={() => setFailedUrl(iconUrl)}
        />
      ) : hasManualIcon && looksLikeEmoji(manualIcon) ? (
        <span className="site-icon-text">{manualIcon}</span>
      ) : hasManualIcon ? (
        <IconByName name={manualIcon} />
      ) : showFavicon ? (
        <img
          alt=""
          className="site-icon-img"
          loading="lazy"
          src={faviconUrl}
          onError={() => setFailedFavicon(faviconUrl)}
        />
      ) : manualIcon ? (
        <IconByName name={manualIcon} />
      ) : (
        <span className="site-icon-text">{initial}</span>
      )}
    </span>
  )
}
