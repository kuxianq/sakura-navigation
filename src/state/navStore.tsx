import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { AiAuditLog, AiCommandResult, AiKeyRecord, NavCategory, NavSite, ThemeSettings } from '../types/navigation'
import { starterCategories, starterSites, starterTheme } from '../data/starter'
import { ensureUniqueId, shortId, slugify } from '../lib/ids'
import { normalizeCategoryIds, removeCategoryFromSite } from '../lib/site-categories'
import { NavStoreContext, type AiKeyDraft, type NavStore } from './navStoreContext'

const STORAGE_KEY = 'sakura-navigation:v1'
const API_STATE_ENDPOINT = '/api/state'
const MAX_AUDIT_LOGS = 80

const appearanceSettingKeys = new Set<keyof ThemeSettings>([
  'siteTitle',
  'siteSubtitle',
  'footerIcon',
  'footerBrand',
  'footerText',
  'backgroundMode',
  'backgroundApi',
  'backgroundUrl',
  'fallbackBackground',
  'animationLevel',
  'preset',
  'primaryColor',
  'accentColor',
  'textColor',
  'panelColor',
  'borderColor',
  'shadowColor',
  'backgroundOpacity',
  'backgroundBlur',
  'backgroundBrightness',
  'backgroundSaturation',
  'homeLayout',
  'showClock',
  'showQuickTags',
  'quickTagLimit',
  'pinnedQuickTags',
  'autoFaviconEnabled',
  'cardVariant',
  'cardRadius',
  'cardOpacity',
  'cardBlur',
  'cardBorderOpacity',
  'cardShadow',
  'cardDensity',
  'showCardDescription',
  'showCardTags',
])

interface PersistedState {
  version: 1
  categories: NavCategory[]
  sites: NavSite[]
  settings: ThemeSettings
  aiKeys: AiKeyRecord[]
  aiAuditLogs: AiAuditLog[]
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function mergeSettings(value: Partial<ThemeSettings> | null | undefined): ThemeSettings {
  return { ...clone(starterTheme), ...(value ?? {}) }
}

function fallbackState(): PersistedState {
  return {
    version: 1,
    categories: clone(starterCategories),
    sites: clone(starterSites),
    settings: clone(starterTheme),
    aiKeys: [],
    aiAuditLogs: [],
  }
}

function readPersistedState(): PersistedState {
  if (typeof window === 'undefined') return fallbackState()
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return fallbackState()
    const parsed = JSON.parse(raw) as Partial<PersistedState>
    return {
      version: 1,
      categories: Array.isArray(parsed.categories) ? parsed.categories : clone(starterCategories),
      sites: Array.isArray(parsed.sites) ? parsed.sites : clone(starterSites),
      settings: mergeSettings(parsed.settings),
      aiKeys: Array.isArray(parsed.aiKeys) ? parsed.aiKeys : [],
      aiAuditLogs: Array.isArray(parsed.aiAuditLogs) ? parsed.aiAuditLogs : [],
    }
  } catch {
    return fallbackState()
  }
}

function persistState(state: PersistedState) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

async function persistRemoteState(state: PersistedState) {
  if (typeof window === 'undefined') return
  try {
    await fetch(API_STATE_ENDPOINT, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(state),
    })
  } catch {
    // Remote sync is best-effort. localStorage remains the preview/offline fallback.
  }
}

function normalizePersistedState(value: Partial<PersistedState> | null | undefined): PersistedState {
  return {
    version: 1,
    categories: Array.isArray(value?.categories) ? value.categories : clone(starterCategories),
    sites: Array.isArray(value?.sites) ? value.sites : clone(starterSites),
    settings: mergeSettings(value?.settings),
    aiKeys: Array.isArray(value?.aiKeys) ? value.aiKeys : [],
    aiAuditLogs: Array.isArray(value?.aiAuditLogs) ? value.aiAuditLogs : [],
  }
}

function clearPersistedState() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(STORAGE_KEY)
}

function makeSecret() {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bytes = new Uint8Array(24)
    crypto.getRandomValues(bytes)
    const token = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
    return `sk_nav_${token}`
  }
  return `sk_nav_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
}

function createAuditLog(log: Omit<AiAuditLog, 'id' | 'createdAt'>): AiAuditLog {
  return {
    id: shortId('audit'),
    createdAt: new Date().toISOString(),
    ...log,
  }
}

function prependLog(logs: AiAuditLog[], log: AiAuditLog) {
  return [log, ...logs].slice(0, MAX_AUDIT_LOGS)
}

function parsePayload(payloadText: string): Record<string, unknown> {
  if (!payloadText.trim()) return {}
  const parsed = JSON.parse(payloadText) as unknown
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('payload 必须是 JSON 对象。')
  }
  return parsed as Record<string, unknown>
}

function reorderWithin<T extends { id: string; sortOrder: number }>(
  items: T[],
  filterKey: ((item: T) => boolean) | null,
  id: string,
  direction: -1 | 1,
): T[] {
  const all = [...items]
  const peers = filterKey ? all.filter(filterKey) : all
  const sorted = [...peers].sort((a, b) => a.sortOrder - b.sortOrder)
  const idx = sorted.findIndex((item) => item.id === id)
  if (idx === -1) return items
  const targetIdx = idx + direction
  if (targetIdx < 0 || targetIdx >= sorted.length) return items
  const a = sorted[idx]
  const b = sorted[targetIdx]
  const swap = a.sortOrder
  a.sortOrder = b.sortOrder
  b.sortOrder = swap
  return all
}

export function NavStoreProvider({ children }: { children: ReactNode }) {
  const [initialState] = useState(readPersistedState)
  const [categories, setCategoriesState] = useState<NavCategory[]>(() => initialState.categories)
  const [sites, setSitesState] = useState<NavSite[]>(() => initialState.sites)
  const [settings, setSettingsState] = useState<ThemeSettings>(() => initialState.settings)
  const [aiKeys, setAiKeysState] = useState<AiKeyRecord[]>(() => initialState.aiKeys)
  const [aiAuditLogs, setAiAuditLogsState] = useState<AiAuditLog[]>(() => initialState.aiAuditLogs)

  const saveSnapshot = useCallback((
    nextCategories: NavCategory[],
    nextSites: NavSite[],
    nextSettings: ThemeSettings,
    nextAiKeys: AiKeyRecord[],
    nextAiAuditLogs: AiAuditLog[],
  ) => {
    const snapshot = {
      version: 1,
      categories: nextCategories,
      sites: nextSites,
      settings: nextSettings,
      aiKeys: nextAiKeys,
      aiAuditLogs: nextAiAuditLogs,
    } satisfies PersistedState
    persistState(snapshot)
    void persistRemoteState(snapshot)
  }, [])

  useEffect(() => {
    let cancelled = false
    async function loadRemoteState() {
      try {
        const response = await fetch(API_STATE_ENDPOINT)
        if (!response.ok) return
        const data = await response.json() as { state?: Partial<PersistedState> | null }
        if (cancelled || !data.state) return
        const next = normalizePersistedState(data.state)
        setCategoriesState(next.categories)
        setSitesState(next.sites)
        setSettingsState(next.settings)
        setAiKeysState(next.aiKeys)
        setAiAuditLogsState(next.aiAuditLogs)
        persistState(next)
      } catch {
        // D1 may be absent during local preview; keep using local fallback state.
      }
    }
    void loadRemoteState()
    return () => {
      cancelled = true
    }
  }, [])

  const commitCategories = useCallback((updater: (prev: NavCategory[]) => NavCategory[]) => {
    setCategoriesState((prev) => {
      const next = updater(prev)
      saveSnapshot(next, sites, settings, aiKeys, aiAuditLogs)
      return next
    })
  }, [aiAuditLogs, aiKeys, saveSnapshot, settings, sites])

  const commitSites = useCallback((updater: (prev: NavSite[]) => NavSite[]) => {
    setSitesState((prev) => {
      const next = updater(prev)
      saveSnapshot(categories, next, settings, aiKeys, aiAuditLogs)
      return next
    })
  }, [aiAuditLogs, aiKeys, categories, saveSnapshot, settings])

  const commitSettings = useCallback((updater: (prev: ThemeSettings) => ThemeSettings) => {
    setSettingsState((prev) => {
      const next = updater(prev)
      saveSnapshot(categories, sites, next, aiKeys, aiAuditLogs)
      return next
    })
  }, [aiAuditLogs, aiKeys, categories, saveSnapshot, sites])

  const createCategory = useCallback<NavStore['createCategory']>((draft) => {
    const baseId = draft.id?.trim() || slugify(draft.name) || shortId('cat')
    const id = ensureUniqueId(baseId, categories.map((c) => c.id), 'cat')
    const nextOrder = draft.sortOrder ?? Math.max(0, ...categories.map((c) => c.sortOrder)) + 1
    const item: NavCategory = {
      id,
      name: draft.name.trim(),
      icon: draft.icon?.trim() || 'Sparkles',
      description: draft.description?.trim() || '',
      sortOrder: nextOrder,
      isVisible: draft.isVisible ?? true,
    }
    commitCategories((prev) => (prev.some((c) => c.id === item.id) ? prev : [...prev, item]))
    return item
  }, [categories, commitCategories])

  const updateCategory = useCallback<NavStore['updateCategory']>((id, patch) => {
    commitCategories((prev) =>
      prev.map((category) => (category.id === id ? { ...category, ...patch, id: category.id } : category)),
    )
  }, [commitCategories])

  const deleteCategory = useCallback<NavStore['deleteCategory']>((id) => {
    const nextCategories = categories.filter((category) => category.id !== id)
    const nextSites = sites.flatMap((site) => {
      const next = removeCategoryFromSite(site, id)
      return next ? [next] : []
    })
    setCategoriesState(nextCategories)
    setSitesState(nextSites)
    saveSnapshot(nextCategories, nextSites, settings, aiKeys, aiAuditLogs)
  }, [aiAuditLogs, aiKeys, categories, saveSnapshot, settings, sites])

  const moveCategory = useCallback<NavStore['moveCategory']>((id, direction) => {
    commitCategories((prev) => reorderWithin(prev, null, id, direction))
  }, [commitCategories])

  const createSite = useCallback<NavStore['createSite']>((draft) => {
    const baseId = draft.id?.trim() || slugify(draft.name) || shortId('site')
    const id = ensureUniqueId(baseId, sites.map((s) => s.id), 'site')
    const peerOrders = sites.filter((s) => s.categoryId === draft.categoryId).map((s) => s.sortOrder)
    const nextOrder = draft.sortOrder ?? (peerOrders.length ? Math.max(...peerOrders) + 1 : 1)
    const item: NavSite = {
      id,
      categoryId: draft.categoryId,
      categoryIds: normalizeCategoryIds(draft.categoryId, draft.categoryIds),
      name: draft.name.trim(),
      url: draft.url.trim(),
      description: draft.description?.trim() || '',
      icon: draft.icon?.trim() || 'Sparkles',
      iconUrl: draft.iconUrl?.trim() || undefined,
      tags: draft.tags ?? [],
      sortOrder: nextOrder,
      isVisible: draft.isVisible ?? true,
      isPrivate: draft.isPrivate ?? false,
      featured: draft.featured ?? false,
      cardVariant: draft.cardVariant,
    }
    commitSites((prev) => (prev.some((s) => s.id === item.id) ? prev : [...prev, item]))
    return item
  }, [commitSites, sites])

  const updateSite = useCallback<NavStore['updateSite']>((id, patch) => {
    commitSites((prev) =>
      prev.map((site) => {
        if (site.id !== id) return site
        const next = { ...site, ...patch, id: site.id }
        return { ...next, categoryIds: normalizeCategoryIds(next.categoryId, next.categoryIds) }
      }),
    )
  }, [commitSites])

  const deleteSite = useCallback<NavStore['deleteSite']>((id) => {
    commitSites((prev) => prev.filter((site) => site.id !== id))
  }, [commitSites])

  const moveSite = useCallback<NavStore['moveSite']>((id, direction) => {
    commitSites((prev) => {
      const target = prev.find((site) => site.id === id)
      if (!target) return prev
      return reorderWithin(prev, (item) => item.categoryId === target.categoryId, id, direction)
    })
  }, [commitSites])

  const updateSettings = useCallback<NavStore['updateSettings']>((patch) => {
    commitSettings((prev) => ({ ...prev, ...patch }))
  }, [commitSettings])

  const createAiKey = useCallback<NavStore['createAiKey']>((draft: AiKeyDraft) => {
    const secret = makeSecret()
    const record: AiKeyRecord = {
      id: shortId('key'),
      name: draft.name.trim() || 'AI 运维 Key',
      prefix: secret.slice(0, 18),
      secret,
      scopes: draft.scopes,
      isActive: true,
      createdAt: new Date().toISOString(),
    }
    const log = createAuditLog({
      keyId: record.id,
      keyName: record.name,
      action: 'key.create',
      result: 'success',
      detail: '本地创建 AI 运维 Key。',
    })
    const nextKeys = [record, ...aiKeys]
    const nextLogs = prependLog(aiAuditLogs, log)
    setAiKeysState(nextKeys)
    setAiAuditLogsState(nextLogs)
    saveSnapshot(categories, sites, settings, nextKeys, nextLogs)
    return record
  }, [aiAuditLogs, aiKeys, categories, saveSnapshot, settings, sites])

  const toggleAiKey = useCallback<NavStore['toggleAiKey']>((id) => {
    const target = aiKeys.find((key) => key.id === id)
    if (!target) return
    const nextKeys = aiKeys.map((key) => (key.id === id ? { ...key, isActive: !key.isActive } : key))
    const nextState = !target.isActive
    const log = createAuditLog({
      keyId: target.id,
      keyName: target.name,
      action: nextState ? 'key.enable' : 'key.disable',
      result: 'success',
      detail: nextState ? '本地启用 AI 运维 Key。' : '本地禁用 AI 运维 Key。',
    })
    const nextLogs = prependLog(aiAuditLogs, log)
    setAiKeysState(nextKeys)
    setAiAuditLogsState(nextLogs)
    saveSnapshot(categories, sites, settings, nextKeys, nextLogs)
  }, [aiAuditLogs, aiKeys, categories, saveSnapshot, settings, sites])

  const deleteAiKey = useCallback<NavStore['deleteAiKey']>((id) => {
    const target = aiKeys.find((key) => key.id === id)
    if (!target) return
    const nextKeys = aiKeys.filter((key) => key.id !== id)
    const log = createAuditLog({
      keyId: target.id,
      keyName: target.name,
      action: 'key.delete',
      result: 'success',
      detail: '本地删除 AI 运维 Key。',
    })
    const nextLogs = prependLog(aiAuditLogs, log)
    setAiKeysState(nextKeys)
    setAiAuditLogsState(nextLogs)
    saveSnapshot(categories, sites, settings, nextKeys, nextLogs)
  }, [aiAuditLogs, aiKeys, categories, saveSnapshot, settings, sites])

  const addAiAuditLog = useCallback<NavStore['addAiAuditLog']>((log) => {
    const nextLogs = prependLog(aiAuditLogs, createAuditLog(log))
    setAiAuditLogsState(nextLogs)
    saveSnapshot(categories, sites, settings, aiKeys, nextLogs)
  }, [aiAuditLogs, aiKeys, categories, saveSnapshot, settings, sites])

  const runAiCommand = useCallback<NavStore['runAiCommand']>((secret, action, payloadText): AiCommandResult => {
    const key = aiKeys.find((item) => item.secret === secret)
    const keyId = key?.id ?? 'unknown'
    const keyName = key?.name ?? 'Unknown Key'

    function finish(result: AiCommandResult) {
      const log = createAuditLog({
        keyId,
        keyName,
        action,
        result: result.result,
        detail: result.message,
      })
      const nextLogs = prependLog(aiAuditLogs, log)
      setAiAuditLogsState(nextLogs)
      saveSnapshot(categories, sites, settings, aiKeys, nextLogs)
      return result
    }

    function commitSuccess(
      result: AiCommandResult,
      nextCategories = categories,
      nextSites = sites,
      nextSettings = settings,
    ) {
      const log = createAuditLog({
        keyId,
        keyName,
        action,
        result: 'success',
        detail: result.message,
      })
      const nextLogs = prependLog(aiAuditLogs, log)
      if (nextCategories !== categories) setCategoriesState(nextCategories)
      if (nextSites !== sites) setSitesState(nextSites)
      if (nextSettings !== settings) setSettingsState(nextSettings)
      setAiAuditLogsState(nextLogs)
      saveSnapshot(nextCategories, nextSites, nextSettings, aiKeys, nextLogs)
      return result
    }

    if (!key) return finish({ ok: false, result: 'blocked', message: 'Key 不存在。' })
    if (!key.isActive) return finish({ ok: false, result: 'blocked', message: 'Key 已禁用。' })

    let payload: Record<string, unknown>
    try {
      payload = parsePayload(payloadText)
    } catch (error) {
      return finish({ ok: false, result: 'error', message: error instanceof Error ? error.message : 'payload 解析失败。' })
    }

    const settingsActions = new Set(['settings.update', 'basic.update', 'footer.update', 'theme.update', 'background.update', 'cards.update'])
    if (settingsActions.has(action)) {
      if (!key.scopes.includes('appearance:write')) return finish({ ok: false, result: 'blocked', message: '缺少 appearance:write 权限。' })
      const blocked = Object.keys(payload).filter((field) => !appearanceSettingKeys.has(field as keyof ThemeSettings))
      if (blocked.length > 0) return finish({ ok: false, result: 'blocked', message: `字段不允许修改：${blocked.join(', ')}` })
      const patch = payload as Partial<ThemeSettings>
      const nextSettings = { ...settings, ...patch }
      return commitSuccess(
        { ok: true, result: 'success', message: `${action} 已执行。`, changed: Object.keys(patch) },
        categories,
        sites,
        nextSettings,
      )
    }

    const contentActions = new Set([
      'site.create',
      'site.update',
      'site.delete',
      'site.reorder',
      'site.visibility.update',
      'category.create',
      'category.update',
      'category.delete',
      'category.reorder',
      'category.visibility.update',
    ])
    if (contentActions.has(action) && !key.scopes.includes('content:write')) {
      return finish({ ok: false, result: 'blocked', message: '缺少 content:write 权限。' })
    }

    if (action === 'site.create') {
      const name = typeof payload.name === 'string' ? payload.name.trim() : ''
      const url = typeof payload.url === 'string' ? payload.url.trim() : ''
      const categoryId = typeof payload.categoryId === 'string' ? payload.categoryId : categories[0]?.id
      if (!name || !url || !categoryId) return finish({ ok: false, result: 'error', message: 'site.create 需要 name、url 和 categoryId。' })
      const item: NavSite = {
        id: ensureUniqueId(slugify(name) || shortId('site'), sites.map((site) => site.id), 'site'),
        categoryId,
        categoryIds: normalizeCategoryIds(categoryId, payload.categoryIds),
        name,
        url,
        description: typeof payload.description === 'string' ? payload.description : '',
        icon: typeof payload.icon === 'string' ? payload.icon : 'Sparkles',
        iconUrl: typeof payload.iconUrl === 'string' ? payload.iconUrl : undefined,
        tags: Array.isArray(payload.tags) ? payload.tags.filter((tag): tag is string => typeof tag === 'string') : [],
        sortOrder: Math.max(0, ...sites.filter((site) => site.categoryId === categoryId).map((site) => site.sortOrder)) + 1,
        isVisible: typeof payload.isVisible === 'boolean' ? payload.isVisible : true,
        isPrivate: typeof payload.isPrivate === 'boolean' ? payload.isPrivate : false,
        featured: typeof payload.featured === 'boolean' ? payload.featured : false,
        cardVariant: typeof payload.cardVariant === 'string' ? payload.cardVariant as NavSite['cardVariant'] : undefined,
      }
      return commitSuccess({ ok: true, result: 'success', message: `已创建站点：${item.name}`, changed: [item.id] }, categories, [...sites, item])
    }

    if (action === 'site.update') {
      const id = typeof payload.id === 'string' ? payload.id : ''
      if (!id) return finish({ ok: false, result: 'error', message: 'site.update 需要 id。' })
      const target = sites.find((site) => site.id === id)
      if (!target) return finish({ ok: false, result: 'blocked', message: `站点不存在：${id}` })
      const patch: Partial<NavSite> = {}
      if (typeof payload.categoryId === 'string') patch.categoryId = payload.categoryId
      if (Array.isArray(payload.categoryIds)) patch.categoryIds = normalizeCategoryIds(patch.categoryId ?? target.categoryId, payload.categoryIds)
      if (typeof payload.name === 'string') patch.name = payload.name.trim()
      if (typeof payload.url === 'string') patch.url = payload.url.trim()
      if (typeof payload.description === 'string') patch.description = payload.description
      if (typeof payload.icon === 'string') patch.icon = payload.icon
      if (typeof payload.iconUrl === 'string') patch.iconUrl = payload.iconUrl
      if (Array.isArray(payload.tags)) patch.tags = payload.tags.filter((tag): tag is string => typeof tag === 'string')
      if (typeof payload.isVisible === 'boolean') patch.isVisible = payload.isVisible
      if (typeof payload.isPrivate === 'boolean') patch.isPrivate = payload.isPrivate
      if (typeof payload.featured === 'boolean') patch.featured = payload.featured
      if (typeof payload.cardVariant === 'string') patch.cardVariant = payload.cardVariant as NavSite['cardVariant']
      const nextSites = sites.map((site) => {
        if (site.id !== id) return site
        const next = { ...site, ...patch, id }
        return { ...next, categoryIds: normalizeCategoryIds(next.categoryId, next.categoryIds) }
      })
      return commitSuccess({ ok: true, result: 'success', message: `已更新站点：${target.name}`, changed: Object.keys(patch) }, categories, nextSites)
    }

    if (action === 'site.delete') {
      const id = typeof payload.id === 'string' ? payload.id : ''
      if (!id) return finish({ ok: false, result: 'error', message: 'site.delete 需要 id。' })
      const target = sites.find((site) => site.id === id)
      if (!target) return finish({ ok: false, result: 'blocked', message: `站点不存在：${id}` })
      return commitSuccess({ ok: true, result: 'success', message: `已删除站点：${target.name}`, changed: [id] }, categories, sites.filter((site) => site.id !== id))
    }

    if (action === 'site.visibility.update') {
      const id = typeof payload.id === 'string' ? payload.id : ''
      if (!id || typeof payload.isVisible !== 'boolean') return finish({ ok: false, result: 'error', message: 'site.visibility.update 需要 id 和 isVisible。' })
      const nextSites = sites.map((site) => (site.id === id ? { ...site, isVisible: payload.isVisible as boolean } : site))
      return commitSuccess({ ok: true, result: 'success', message: `已更新站点可见性：${id}`, changed: [id, 'isVisible'] }, categories, nextSites)
    }

    if (action === 'site.reorder') {
      const id = typeof payload.id === 'string' ? payload.id : ''
      const direction = payload.direction === 'up' ? -1 : payload.direction === 'down' ? 1 : null
      if (!id || direction === null) return finish({ ok: false, result: 'error', message: 'site.reorder 需要 id 和 direction: up/down。' })
      const target = sites.find((site) => site.id === id)
      if (!target) return finish({ ok: false, result: 'blocked', message: `站点不存在：${id}` })
      const nextSites = reorderWithin(sites, (site) => site.categoryId === target.categoryId, id, direction)
      return commitSuccess({ ok: true, result: 'success', message: `已调整站点排序：${target.name}`, changed: [id] }, categories, nextSites)
    }

    if (action === 'category.create') {
      const name = typeof payload.name === 'string' ? payload.name.trim() : ''
      if (!name) return finish({ ok: false, result: 'error', message: 'category.create 需要 name。' })
      const item: NavCategory = {
        id: ensureUniqueId(slugify(name) || shortId('cat'), categories.map((category) => category.id), 'cat'),
        name,
        icon: typeof payload.icon === 'string' ? payload.icon : 'Sparkles',
        description: typeof payload.description === 'string' ? payload.description : '',
        sortOrder: Math.max(0, ...categories.map((category) => category.sortOrder)) + 1,
        isVisible: typeof payload.isVisible === 'boolean' ? payload.isVisible : true,
      }
      return commitSuccess({ ok: true, result: 'success', message: `已创建分类：${item.name}`, changed: [item.id] }, [...categories, item], sites)
    }

    if (action === 'category.update') {
      const id = typeof payload.id === 'string' ? payload.id : ''
      if (!id) return finish({ ok: false, result: 'error', message: 'category.update 需要 id。' })
      const target = categories.find((category) => category.id === id)
      if (!target) return finish({ ok: false, result: 'blocked', message: `分类不存在：${id}` })
      const patch: Partial<NavCategory> = {}
      if (typeof payload.name === 'string') patch.name = payload.name.trim()
      if (typeof payload.icon === 'string') patch.icon = payload.icon
      if (typeof payload.description === 'string') patch.description = payload.description
      if (typeof payload.isVisible === 'boolean') patch.isVisible = payload.isVisible
      const nextCategories = categories.map((category) => (category.id === id ? { ...category, ...patch, id } : category))
      return commitSuccess({ ok: true, result: 'success', message: `已更新分类：${target.name}`, changed: Object.keys(patch) }, nextCategories, sites)
    }

    if (action === 'category.delete') {
      const id = typeof payload.id === 'string' ? payload.id : ''
      if (!id) return finish({ ok: false, result: 'error', message: 'category.delete 需要 id。' })
      const target = categories.find((category) => category.id === id)
      if (!target) return finish({ ok: false, result: 'blocked', message: `分类不存在：${id}` })
      return commitSuccess(
        { ok: true, result: 'success', message: `已删除分类并处理相关站点归属：${target.name}`, changed: [id] },
        categories.filter((category) => category.id !== id),
        sites.flatMap((site) => {
          const next = removeCategoryFromSite(site, id)
          return next ? [next] : []
        }),
      )
    }

    if (action === 'category.visibility.update') {
      const id = typeof payload.id === 'string' ? payload.id : ''
      if (!id || typeof payload.isVisible !== 'boolean') return finish({ ok: false, result: 'error', message: 'category.visibility.update 需要 id 和 isVisible。' })
      const nextCategories = categories.map((category) => (category.id === id ? { ...category, isVisible: payload.isVisible as boolean } : category))
      return commitSuccess({ ok: true, result: 'success', message: `已更新分类可见性：${id}`, changed: [id, 'isVisible'] }, nextCategories, sites)
    }

    if (action === 'category.reorder') {
      const id = typeof payload.id === 'string' ? payload.id : ''
      const direction = payload.direction === 'up' ? -1 : payload.direction === 'down' ? 1 : null
      if (!id || direction === null) return finish({ ok: false, result: 'error', message: 'category.reorder 需要 id 和 direction: up/down。' })
      const target = categories.find((category) => category.id === id)
      if (!target) return finish({ ok: false, result: 'blocked', message: `分类不存在：${id}` })
      const nextCategories = reorderWithin(categories, null, id, direction)
      return commitSuccess({ ok: true, result: 'success', message: `已调整分类排序：${target.name}`, changed: [id] }, nextCategories, sites)
    }

    return finish({ ok: false, result: 'blocked', message: `暂不支持的 action：${action}` })
  }, [aiAuditLogs, aiKeys, categories, saveSnapshot, settings, sites])


  const resetAll = useCallback<NavStore['resetAll']>(() => {
    const next = fallbackState()
    clearPersistedState()
    setCategoriesState(next.categories)
    setSitesState(next.sites)
    setSettingsState(next.settings)
    setAiKeysState(next.aiKeys)
    setAiAuditLogsState(next.aiAuditLogs)
  }, [])

  const value = useMemo<NavStore>(
    () => ({
      categories,
      sites,
      settings,
      aiKeys,
      aiAuditLogs,
      createCategory,
      updateCategory,
      deleteCategory,
      moveCategory,
      createSite,
      updateSite,
      deleteSite,
      moveSite,
      updateSettings,
      createAiKey,
      toggleAiKey,
      deleteAiKey,
      addAiAuditLog,
      runAiCommand,
      resetAll,
    }),
    [
      categories,
      sites,
      settings,
      aiKeys,
      aiAuditLogs,
      createCategory,
      updateCategory,
      deleteCategory,
      moveCategory,
      createSite,
      updateSite,
      deleteSite,
      moveSite,
      updateSettings,
      createAiKey,
      toggleAiKey,
      deleteAiKey,
      addAiAuditLog,
      runAiCommand,
      resetAll,
    ],
  )

  return <NavStoreContext.Provider value={value}>{children}</NavStoreContext.Provider>
}
