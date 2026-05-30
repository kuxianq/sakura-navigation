export type CardVariant = 'glass' | 'float' | 'solid' | 'minimal'
export type ThemePreset = 'sakura' | 'sky' | 'night' | 'aqua' | 'cream'
export type BackgroundMode = 'gradient' | 'api' | 'custom'
export type AnimationLevel = 'none' | 'soft' | 'rich'
export type AiScope = 'content:read' | 'content:write' | 'appearance:read' | 'appearance:write' | 'ops:read' | 'audit:read'

export interface AiKeyRecord {
  id: string
  name: string
  prefix: string
  secret?: string
  scopes: AiScope[]
  isActive: boolean
  createdAt: string
  updatedAt?: string
  lastUsedAt?: string
}

export interface AiAuditLog {
  id: string
  keyId: string
  keyName: string
  action: string
  result: 'success' | 'blocked' | 'error'
  createdAt: string
  detail: string
}

export interface AiCommandResult {
  ok: boolean
  result: 'success' | 'blocked' | 'error'
  message: string
  changed?: string[]
}

export interface NavCategory {
  id: string
  name: string
  icon: string
  description?: string
  sortOrder: number
  isVisible: boolean
}

export interface NavSite {
  id: string
  categoryId: string
  categoryIds?: string[]
  name: string
  url: string
  description: string
  icon: string
  iconUrl?: string
  tags: string[]
  sortOrder: number
  isVisible: boolean
  isPrivate?: boolean
  cardVariant?: CardVariant
}

export interface ThemeSettings {
  siteTitle: string
  siteSubtitle: string
  footerIcon: string
  footerBrand: string
  footerText: string
  siteIconSvg: string
  siteIconUrl?: string
  backgroundMode: BackgroundMode
  backgroundApi: string
  backgroundUrl?: string
  fallbackBackground: string
  overlayOpacity: number
  blur: number
  cardVariant: CardVariant
  animationLevel: AnimationLevel

  preset: ThemePreset
  primaryColor: string
  accentColor: string
  textColor: string
  panelColor: string
  borderColor: string
  shadowColor: string
  backgroundOpacity: number
  backgroundBlur: number
  backgroundBrightness: number
  backgroundSaturation: number
  cardRadius: number
  cardOpacity: number
  cardBlur: number
  cardBorderOpacity: number
  cardShadow: number
  cardDensity: 'compact' | 'standard' | 'loose'
  showCardDescription: boolean
  showCardTags: boolean
  frontendPasswordEnabled: boolean
  frontendPassword: string
  adminPasswordEnabled: boolean
  adminPassword: string
  sessionMinutes: number
  aiOpsEnabled: boolean
  aiReadonly: boolean
}
