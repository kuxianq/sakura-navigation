import { useMemo, useState } from 'react'
import { Bot, Database, Image, Info, LayoutDashboard, LayoutTemplate, ListChecks, Palette, ShieldCheck, Sparkles, Tags } from 'lucide-react'
import { useNavStore } from '../../state/navStoreContext'
import { AiKeyTab } from './AiKeyTab'
import { CategoriesTab } from './CategoriesTab'
import { SecurityTab } from './SecurityTab'
import { SitesTab } from './SitesTab'
import { SettingsTab } from './SettingsTab'

type TabId = 'overview' | 'basic' | 'theme' | 'background' | 'cards' | 'categories' | 'sites' | 'security' | 'ai'

const tabs: { id: TabId; label: string; icon: typeof ListChecks; group?: string }[] = [
  { id: 'overview', label: '概览', icon: LayoutDashboard },
  { id: 'basic', label: '基础信息', icon: Info, group: '站点外观' },
  { id: 'theme', label: '主题设置', icon: Palette, group: '站点外观' },
  { id: 'background', label: '背景设置', icon: Image, group: '站点外观' },
  { id: 'cards', label: '卡片样式', icon: LayoutTemplate, group: '站点外观' },
  { id: 'categories', label: '分类设置', icon: ListChecks, group: '内容管理' },
  { id: 'sites', label: '站点设置', icon: Tags, group: '内容管理' },
  { id: 'security', label: '访问安全', icon: ShieldCheck, group: '安全与运维' },
  { id: 'ai', label: 'AI 运维 Key', icon: Bot, group: '安全与运维' },
]

export function AdminConsole() {
  const { categories, sites, settings } = useNavStore()
  const [tab, setTab] = useState<TabId>('overview')

  const stats = useMemo(
    () => [
      { label: '分类', value: categories.length, icon: ListChecks },
      { label: '站点', value: sites.length, icon: Tags },
      { label: '首页可见', value: sites.filter((s) => s.isVisible).length, icon: Database },
      { label: '当前主题', value: settings.preset === 'sakura' ? '樱花粉漫' : settings.preset, icon: Palette },
    ],
    [categories, settings.preset, sites],
  )

  const currentTab = tabs.find((entry) => entry.id === tab) ?? tabs[0]
  const CurrentIcon = currentTab.icon

  return (
    <section className="smart-console">
      <aside className="console-sidebar">
        <div className="console-logo">
          <span><Sparkles size={20} /></span>
          <div>
            <strong>智能控制台</strong>
          </div>
        </div>
        <nav className="console-nav" aria-label="后台导航">
          {tabs.map((entry, index) => {
            const Icon = entry.icon
            const active = tab === entry.id
            const previousGroup = index > 0 ? tabs[index - 1].group : undefined
            const groupChanged = entry.group && entry.group !== previousGroup
            return (
              <div className="console-nav-item" key={entry.id}>
                {groupChanged ? <span className="console-nav-group">{entry.group}</span> : null}
                <button type="button" className={active ? 'active' : ''} onClick={() => setTab(entry.id)}>
                  <Icon size={17} /> {entry.label}
                </button>
              </div>
            )
          })}
        </nav>
      </aside>

      <div className="console-main">
        <header className="console-topbar">
          <div className="console-title-block">
            <p className="eyebrow"><CurrentIcon size={16} /> {currentTab.label}</p>
            <h1>{tab === 'overview' ? settings.siteTitle : currentTab.label}</h1>
            <p>{tab === 'overview' ? '总览站点内容、入口数量与当前视觉状态。' : ''}</p>
          </div>
        </header>

        {tab === 'overview' ? (
          <div className="console-overview">
            <section className="overview-hero">
              <div>
                <p className="eyebrow"><Sparkles size={16} /> 控制中心</p>
                <p className="overview-lead">快速查看分类、站点、可见入口与当前主题状态。</p>
              </div>
            </section>
            <div className="console-metrics">
              {stats.map((stat) => (
                <article className="metric-card" key={stat.label}>
                  <span><stat.icon size={18} /></span>
                  <strong>{stat.value}</strong>
                  <small>{stat.label}</small>
                </article>
              ))}
            </div>

          </div>
        ) : null}
        {tab === 'basic' ? <SettingsTab panel="basic" /> : null}
        {tab === 'theme' ? <SettingsTab panel="theme" /> : null}
        {tab === 'background' ? <SettingsTab panel="background" /> : null}
        {tab === 'cards' ? <SettingsTab panel="cards" /> : null}
        {tab === 'categories' ? <CategoriesTab /> : null}
        {tab === 'sites' ? <SitesTab /> : null}
        {tab === 'security' ? <SecurityTab /> : null}
        {tab === 'ai' ? <AiKeyTab /> : null}
      </div>
    </section>
  )
}
