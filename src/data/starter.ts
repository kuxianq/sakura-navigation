import type { NavCategory, NavSite, ThemeSettings } from '../types/navigation'

export const starterTheme: ThemeSettings = {
  siteTitle: 'Sakura Navigation',
  siteSubtitle: 'A clean and gentle personal navigation page.',
  footerIcon: '🌸',
  footerBrand: 'Sakura Navigation',
  footerText: 'Collect useful links in one quiet place',
  backgroundMode: 'api',
  backgroundApi: 'https://www.loliapi.com/acg/?type=json',
  fallbackBackground: '/assets/fallback-bg.svg',
  overlayOpacity: 0.42,
  blur: 18,
  cardVariant: 'glass',
  animationLevel: 'soft',
  preset: 'sakura',
  primaryColor: '#ff8fbd',
  accentColor: '#ffe3f0',
  textColor: '#fff7fb',
  panelColor: 'rgba(54, 24, 55, 0.46)',
  borderColor: 'rgba(255, 214, 231, 0.28)',
  shadowColor: 'rgba(40, 9, 37, 0.42)',
  backgroundOpacity: 0.42,
  backgroundBlur: 0,
  backgroundBrightness: 0.95,
  backgroundSaturation: 1.1,
  cardRadius: 22,
  cardOpacity: 0.12,
  cardBlur: 13,
  cardBorderOpacity: 0.24,
  cardShadow: 0.18,
  cardDensity: 'compact',
  showCardDescription: true,
  showCardTags: true,
  frontendPasswordEnabled: false,
  frontendPassword: '',
  adminPasswordEnabled: false,
  adminPassword: '',
  sessionMinutes: 120,
  aiOpsEnabled: false,
  aiReadonly: false,
}

export const starterCategories: NavCategory[] = [
  { id: 'common', name: 'Common Links', icon: 'Compass', description: 'Frequently used entries.', sortOrder: 1, isVisible: true },
  { id: 'resources', name: 'Resources', icon: 'BookOpen', description: 'Documents, references, and saved materials.', sortOrder: 2, isVisible: true },
  { id: 'tools', name: 'Tools', icon: 'Wrench', description: 'Utilities and workbench links.', sortOrder: 3, isVisible: true },
]

export const starterSites: NavSite[] = [
  { id: 'home-entry', categoryId: 'common', name: 'Home Entry', url: 'https://example.com', description: 'A placeholder entry for the navigation homepage.', icon: 'Sparkles', tags: ['Home'], sortOrder: 1, isVisible: true },
  { id: 'reference-entry', categoryId: 'resources', name: 'Reference Entry', url: 'https://example.com/reference', description: 'A placeholder entry for documents or references.', icon: 'BookOpen', tags: ['Docs'], sortOrder: 1, isVisible: true },
  { id: 'tool-entry', categoryId: 'tools', name: 'Tool Entry', url: 'https://example.com/tool', description: 'A placeholder entry for a useful tool.', icon: 'Wrench', tags: ['Tool'], sortOrder: 1, isVisible: true },
]
