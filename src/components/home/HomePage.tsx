import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, Clock3, ExternalLink, Search, Sparkles } from 'lucide-react'
import { useNavStore } from '../../state/navStoreContext'
import { siteBelongsToCategory } from '../../lib/site-categories'
import { IconByName } from '../../lib/icons'
import type { NavCategory, NavSite } from '../../types/navigation'
import { SiteIcon } from './SiteIcon'

interface CategoryGroup {
  category: NavCategory
  sites: NavSite[]
}

function formatClock(now: Date) {
  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(now)
}

function formatDate(now: Date) {
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(now)
}

function HomeClock() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000)
    return () => window.clearInterval(timer)
  }, [])

  return (
    <div className="time-card" aria-label="当前时间">
      <Clock3 size={18} />
      <strong>{formatClock(now)}</strong>
      <span><CalendarDays size={14} />{formatDate(now)}</span>
    </div>
  )
}

interface SearchPanelProps {
  query: string
  onQueryChange: (value: string) => void
  tags: string[]
  activeTag: string
  onTagToggle: (tag: string) => void
  showQuickTags: boolean
}

function SearchPanel({ query, onQueryChange, tags, activeTag, onTagToggle, showQuickTags }: SearchPanelProps) {
  return (
    <>
      <form
        className="search-card resource-search-card"
        onSubmit={(event) => event.preventDefault()}
      >
        <label htmlFor="site-search"><Search size={18} /> 搜索站点</label>
        <Search className="search-leading-icon" size={18} aria-hidden="true" />
        <input
          id="site-search"
          placeholder="搜索名称、描述、链接或标签..."
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
        />
        {query ? (
          <button className="clear-search" type="button" onClick={() => onQueryChange('')}>清空</button>
        ) : null}
      </form>

      {showQuickTags && tags.length > 0 ? (
        <div className="quick-tags" aria-label="快捷标签">
          {tags.map((tag) => (
            <button
              key={tag}
              className={activeTag === tag ? 'active' : ''}
              onClick={() => onTagToggle(tag)}
              type="button"
            >
              #{tag}
            </button>
          ))}
        </div>
      ) : null}
    </>
  )
}

interface CategoryFilterProps {
  categories: NavCategory[]
  activeCategory: string
  onCategoryChange: (categoryId: string) => void
}

function CategoryFilter({ categories, activeCategory, onCategoryChange }: CategoryFilterProps) {
  return (
    <section className="category-strip" aria-label="分类">
      <button
        className={activeCategory === 'all' ? 'active' : ''}
        onClick={() => onCategoryChange('all')}
        type="button"
      >
        <Sparkles size={16} /> 全部
      </button>
      {categories.map((category) => (
        <button
          key={category.id}
          className={activeCategory === category.id ? 'active' : ''}
          onClick={() => onCategoryChange(category.id)}
          type="button"
        >
          <IconByName name={category.icon} className="mini-icon" />
          {category.name}
        </button>
      ))}
    </section>
  )
}

interface SiteCardGridProps {
  sites: NavSite[]
  density: string
  cardVariant: string
  showDescription: boolean
  showTags: boolean
  autoFaviconEnabled: boolean
}

function SiteCardGrid({ sites, density, cardVariant, showDescription, showTags, autoFaviconEnabled }: SiteCardGridProps) {
  return (
    <div className={`site-grid density-${density}`}>
      {sites.map((site) => (
        <a
          className={`site-card resource-site-card ${site.cardVariant ?? cardVariant}`}
          href={site.url}
          key={site.id}
          rel="noreferrer"
          target="_blank"
        >
          <SiteIcon site={site} autoFaviconEnabled={autoFaviconEnabled} />
          {site.featured ? <span className="site-badge">推荐</span> : null}
          <span className="site-body">
            <strong>{site.name}</strong>
            {showDescription ? <small title={site.description}>{site.description}</small> : null}
            {showTags ? (
              <span className="tag-row">
                {site.tags.map((tag) => <em key={tag}>{tag}</em>)}
              </span>
            ) : null}
          </span>
          <ExternalLink className="open-icon" size={18} />
        </a>
      ))}
    </div>
  )
}

interface GroupedSectionsProps {
  groups: CategoryGroup[]
  density: string
  cardVariant: string
  showDescription: boolean
  showTags: boolean
  autoFaviconEnabled: boolean
}

function GroupedSections({ groups, density, cardVariant, showDescription, showTags, autoFaviconEnabled }: GroupedSectionsProps) {
  return (
    <section className="category-sections" aria-label="分类站点入口">
      {groups.map((group) => (
        <section className="site-section" key={group.category.id}>
          <header className="site-section-head">
            <span className="section-dot" />
            <IconByName name={group.category.icon} className="section-icon" />
            <div>
              <h2>{group.category.name}</h2>
              {group.category.description ? <p>{group.category.description}</p> : null}
            </div>
            <span className="section-line" />
            <em>{group.sites.length}</em>
          </header>

          <SiteCardGrid
            sites={group.sites}
            density={density}
            cardVariant={cardVariant}
            showDescription={showDescription}
            showTags={showTags}
            autoFaviconEnabled={autoFaviconEnabled}
          />
        </section>
      ))}
    </section>
  )
}

export function HomePage() {
  const { categories, sites, settings } = useNavStore()
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [activeTag, setActiveTag] = useState('')

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

  const featuredTags = useMemo(() => {
    const counts = new Map<string, number>()
    sites
      .filter((site) => site.isVisible)
      .flatMap((site) => site.tags)
      .map((tag) => tag.trim())
      .filter(Boolean)
      .forEach((tag) => counts.set(tag, (counts.get(tag) ?? 0) + 1))

    const autoTags = [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh-CN'))
      .map(([tag]) => tag)
    return [...new Set([...settings.pinnedQuickTags, ...autoTags])].slice(0, settings.quickTagLimit)
  }, [settings.pinnedQuickTags, settings.quickTagLimit, sites])

  const filteredSites = useMemo<NavSite[]>(() => {
    const normalized = query.trim().toLowerCase()
    return sites
      .filter((site) => site.isVisible)
      .filter((site) => effectiveCategory === 'all' || siteBelongsToCategory(site, effectiveCategory))
      .filter((site) => !activeTag || site.tags.includes(activeTag))
      .filter((site) => {
        if (!normalized) return true
        return [site.name, site.description, site.url, ...site.tags]
          .join(' ')
          .toLowerCase()
          .includes(normalized)
      })
      .sort((a, b) => a.sortOrder - b.sortOrder)
  }, [activeTag, effectiveCategory, query, sites])

  const groupedSites = useMemo<CategoryGroup[]>(() => {
    const sortSites = (items: NavSite[]) => [...items].sort((a, b) => a.sortOrder - b.sortOrder)

    if (effectiveCategory !== 'all') {
      const category = visibleCategories.find((item) => item.id === effectiveCategory)
      return category && filteredSites.length > 0 ? [{ category, sites: sortSites(filteredSites) }] : []
    }

    const groups = visibleCategories
      .map((category) => ({
        category,
        sites: sortSites(filteredSites.filter((site) => siteBelongsToCategory(site, category.id))),
      }))
      .filter((group) => group.sites.length > 0)

    const groupedIds = new Set(groups.flatMap((group) => group.sites.map((site) => site.id)))
    const uncategorized = filteredSites.filter((site) => !groupedIds.has(site.id))
    if (uncategorized.length > 0) {
      groups.push({
        category: { id: 'uncategorized', name: '其他收藏', icon: 'Sparkles', sortOrder: 999, isVisible: true },
        sites: sortSites(uncategorized),
      })
    }

    return groups
  }, [effectiveCategory, filteredSites, visibleCategories])

  function toggleTag(tag: string) {
    setActiveTag((current) => (current === tag ? '' : tag))
  }

  const hasResults = settings.homeLayout === 'grouped' ? groupedSites.length > 0 : filteredSites.length > 0

  return (
    <div className="home-page resource-home">
      <section className="resource-hero-panel">
        {settings.showClock ? <HomeClock /> : null}

        <div className="hero-copy">
          <p className="eyebrow"><Sparkles size={15} /> Resource Portal</p>
          <h1>{settings.siteTitle}</h1>
          <p>{settings.siteSubtitle}</p>
        </div>

        <SearchPanel
          query={query}
          onQueryChange={setQuery}
          tags={featuredTags}
          activeTag={activeTag}
          onTagToggle={toggleTag}
          showQuickTags={settings.showQuickTags}
        />
      </section>

      <CategoryFilter
        categories={visibleCategories}
        activeCategory={effectiveCategory}
        onCategoryChange={setActiveCategory}
      />

      {!hasResults ? (
        <section className="empty-state">
          <Sparkles size={28} />
          <h2>没有匹配的站点</h2>
          <p>换个分类、标签，或者清空搜索试试。</p>
        </section>
      ) : settings.homeLayout === 'grouped' ? (
        <GroupedSections
          groups={groupedSites}
          density={settings.cardDensity}
          cardVariant={settings.cardVariant}
          showDescription={settings.showCardDescription}
          showTags={settings.showCardTags}
          autoFaviconEnabled={settings.autoFaviconEnabled}
        />
      ) : (
        <section aria-label="站点入口">
          <SiteCardGrid
            sites={filteredSites}
            density={settings.cardDensity}
            cardVariant={settings.cardVariant}
            showDescription={settings.showCardDescription}
            showTags={settings.showCardTags}
            autoFaviconEnabled={settings.autoFaviconEnabled}
          />
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
