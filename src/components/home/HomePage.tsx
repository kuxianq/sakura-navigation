import { useMemo, useState } from 'react'
import { ExternalLink, Search, Sparkles } from 'lucide-react'
import { useNavStore } from '../../state/navStoreContext'
import { siteBelongsToCategory } from '../../lib/site-categories'
import { IconByName } from '../../lib/icons'
import type { NavSite } from '../../types/navigation'
import { SiteIcon } from './SiteIcon'

export function HomePage() {
  const { categories, sites, settings } = useNavStore()
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')

  const visibleCategories = useMemo(
    () => categories.filter((category) => category.isVisible).sort((a, b) => a.sortOrder - b.sortOrder),
    [categories],
  )

  // Derive the effective filter at render time. If the selected category was hidden
  // or deleted in admin, fall back to 'all' without a state-syncing effect.
  const effectiveCategory = useMemo(() => {
    if (activeCategory === 'all') return 'all'
    return visibleCategories.some((c) => c.id === activeCategory) ? activeCategory : 'all'
  }, [activeCategory, visibleCategories])

  const filteredSites = useMemo<NavSite[]>(() => {
    const normalized = query.trim().toLowerCase()
    return sites
      .filter((site) => site.isVisible)
      .filter((site) => effectiveCategory === 'all' || siteBelongsToCategory(site, effectiveCategory))
      .filter((site) => {
        if (!normalized) return true
        return [site.name, site.description, site.url, ...site.tags]
          .join(' ')
          .toLowerCase()
          .includes(normalized)
      })
      .sort((a, b) => a.sortOrder - b.sortOrder)
  }, [effectiveCategory, query, sites])

  return (
    <div className="home-page">
      <section className="hero-panel">
        <div className="hero-copy">
          <h1>{settings.siteTitle}</h1>
          <p>{settings.siteSubtitle}</p>
        </div>
        <div className="search-card">
          <label htmlFor="site-search"><Search size={18} /> 搜索站点</label>
          <input
            id="site-search"
            placeholder="搜索名称、描述或标签..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      </section>

      <section className="category-strip" aria-label="分类">
        <button
          className={effectiveCategory === 'all' ? 'active' : ''}
          onClick={() => setActiveCategory('all')}
          type="button"
        >
          <Sparkles size={16} /> 全部
        </button>
        {visibleCategories.map((category) => (
          <button
            key={category.id}
            className={effectiveCategory === category.id ? 'active' : ''}
            onClick={() => setActiveCategory(category.id)}
            type="button"
          >
            <IconByName name={category.icon} className="mini-icon" />
            {category.name}
          </button>
        ))}
      </section>

      {filteredSites.length === 0 ? (
        <section className="empty-state">
          <Sparkles size={28} />
          <h2>没有匹配的站点</h2>
          <p>换个分类，或者清空搜索试试。</p>
        </section>
      ) : (
        <section className={`site-grid density-${settings.cardDensity}`} aria-label="站点入口">
          {filteredSites.map((site) => (
            <a
              className={`site-card ${site.cardVariant ?? settings.cardVariant}`}
              href={site.url}
              key={site.id}
              rel="noreferrer"
              target="_blank"
            >
              <SiteIcon site={site} />
              <span className="site-body">
                <strong>{site.name}</strong>
                {settings.showCardDescription ? <small title={site.description}>{site.description}</small> : null}
                {settings.showCardTags ? (
                  <span className="tag-row">
                    {site.tags.map((tag) => <em key={tag}>{tag}</em>)}
                  </span>
                ) : null}
              </span>
              <ExternalLink className="open-icon" size={18} />
            </a>
          ))}
        </section>
      )}

      <footer className="floating-footer" aria-label="页面页脚">
        <span className="footer-mark">{settings.footerIcon}</span>
        <strong>{settings.footerBrand}</strong>
        <span>{settings.footerText}</span>
      </footer>
    </div>
  )
}
