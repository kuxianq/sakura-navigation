import { useState } from 'react'
import { IconByName } from '../../lib/icons'
import type { NavSite } from '../../types/navigation'

interface SiteIconProps {
  site: Pick<NavSite, 'icon' | 'iconUrl' | 'name'>
}

export function SiteIcon({ site }: SiteIconProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const iconUrl = site.iconUrl?.trim()
  const showImage = !!iconUrl && failedUrl !== iconUrl

  return (
    <span className="site-icon" aria-hidden="true">
      {showImage ? (
        <img
          alt=""
          className="site-icon-img"
          loading="lazy"
          src={iconUrl}
          onError={() => setFailedUrl(iconUrl)}
        />
      ) : (
        <IconByName name={site.icon} />
      )}
    </span>
  )
}
