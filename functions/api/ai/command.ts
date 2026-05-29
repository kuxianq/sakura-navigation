import { z } from 'zod'
import { json, requireDb, sha256Hex, type Env } from '../_types'

const STATE_KEY = 'main'
const MAX_AUDIT_LOGS = 80

const aiScopes = ['content:read', 'content:write', 'appearance:read', 'appearance:write', 'ops:read', 'audit:read'] as const
type AiScope = typeof aiScopes[number]

type CommandResult = 'success' | 'blocked' | 'error'

interface NavCategory {
  id: string
  name: string
  icon: string
  description?: string
  sortOrder: number
  isVisible: boolean
}

interface NavSite {
  id: string
  categoryId: string
  name: string
  url: string
  description: string
  icon: string
  tags: string[]
  sortOrder: number
  isVisible: boolean
  isPrivate?: boolean
  cardVariant?: 'glass' | 'float' | 'solid' | 'minimal'
}

interface AppState {
  version: 1
  categories: NavCategory[]
  sites: NavSite[]
  settings: Record<string, unknown>
  aiKeys?: unknown[]
  aiAuditLogs?: unknown[]
}

interface AiKeyRow {
  id: string
  name: string
  prefix: string
  scopes_json: string
  is_active: number
}

const commandSchema = z.object({
  action: z.string().trim().min(1),
  payload: z.record(z.string(), z.unknown()).default({}),
})

const appearanceSettingKeys = new Set([
  'siteTitle',
  'siteSubtitle',
  'siteIconSvg',
  'siteIconUrl',
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

const forbiddenSettingKeys = new Set([
  'frontendPasswordEnabled',
  'frontendPassword',
  'adminPasswordEnabled',
  'adminPassword',
  'sessionMinutes',
  'aiOpsEnabled',
  'aiReadonly',
])

function makeId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`
}

function prefixOf(secret: string) {
  return secret.slice(0, 18)
}

function hasScope(scopes: AiScope[], scope: AiScope) {
  return scopes.includes(scope)
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function ensureUniqueId(base: string, existing: string[], fallbackPrefix: string) {
  const clean = base || `${fallbackPrefix}-${crypto.randomUUID().slice(0, 8)}`
  if (!existing.includes(clean)) return clean
  let idx = 2
  while (existing.includes(`${clean}-${idx}`)) idx += 1
  return `${clean}-${idx}`
}

async function loadState(db: D1Database): Promise<AppState> {
  const row = await db.prepare('SELECT value_json FROM app_state WHERE key = ?').bind(STATE_KEY).first<{ value_json: string }>()
  if (!row) throw new Error('App state is not initialized')
  const state = JSON.parse(row.value_json) as Partial<AppState>
  return {
    version: 1,
    categories: Array.isArray(state.categories) ? state.categories : [],
    sites: Array.isArray(state.sites) ? state.sites : [],
    settings: state.settings && typeof state.settings === 'object' ? state.settings as Record<string, unknown> : {},
    aiKeys: Array.isArray(state.aiKeys) ? state.aiKeys : [],
    aiAuditLogs: Array.isArray(state.aiAuditLogs) ? state.aiAuditLogs : [],
  }
}

async function saveState(db: D1Database, state: AppState) {
  await db.prepare(`INSERT INTO app_state (key, value_json, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = CURRENT_TIMESTAMP`)
    .bind(STATE_KEY, JSON.stringify(state))
    .run()
}

async function writeAudit(
  db: D1Database,
  key: AiKeyRow | null,
  action: string,
  result: CommandResult,
  detail: string,
  payload: unknown,
) {
  const audit = {
    id: makeId('audit'),
    keyId: key?.id ?? 'unknown',
    keyName: key?.name ?? 'Unknown Key',
    action,
    result,
    createdAt: new Date().toISOString(),
    detail,
  }

  await db.prepare('INSERT INTO audit_logs (id, actor, action, target_type, target_id, after_json) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(audit.id, key ? `ai:${key.prefix}` : 'ai:unknown', action, action.split('.')[0], key?.id ?? null, JSON.stringify({ result, detail, payload }))
    .run()

  try {
    const state = await loadState(db)
    const logs = Array.isArray(state.aiAuditLogs) ? state.aiAuditLogs : []
    state.aiAuditLogs = [audit, ...logs].slice(0, MAX_AUDIT_LOGS)
    await saveState(db, state)
  } catch {
    // D1 audit_logs is the durable source; app_state log sync is best-effort.
  }
}

async function authenticate(db: D1Database, request: Request): Promise<{ key: AiKeyRow; scopes: AiScope[] } | Response> {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim()
  if (!token || !token.startsWith('sk_nav_')) return json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  const hash = await sha256Hex(token)
  const prefix = prefixOf(token)
  const key = await db.prepare('SELECT id, name, prefix, scopes_json, is_active FROM ai_keys WHERE prefix = ? AND key_hash = ?')
    .bind(prefix, hash)
    .first<AiKeyRow>()
  if (!key) return json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  if (!key.is_active) return json({ ok: false, error: 'Key is disabled' }, { status: 403 })
  const parsedScopes = JSON.parse(key.scopes_json) as unknown
  const scopes = Array.isArray(parsedScopes) ? parsedScopes.filter((scope): scope is AiScope => (aiScopes as readonly string[]).includes(String(scope))) : []
  return { key, scopes }
}

function requireScope(scopes: AiScope[], scope: AiScope) {
  if (!hasScope(scopes, scope)) throw new Response(JSON.stringify({ ok: false, error: `Missing scope: ${scope}` }, null, 2), {
    status: 403,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  })
}

function changedKeys(value: Record<string, unknown>) {
  return Object.keys(value)
}

function patchSettings(state: AppState, payload: Record<string, unknown>) {
  const blocked = Object.keys(payload).filter((key) => forbiddenSettingKeys.has(key) || !appearanceSettingKeys.has(key))
  if (blocked.length) throw new Error(`字段不允许修改：${blocked.join(', ')}`)
  state.settings = { ...state.settings, ...payload }
  return changedKeys(payload)
}

function createSite(state: AppState, payload: Record<string, unknown>) {
  const name = typeof payload.name === 'string' ? payload.name.trim() : ''
  const url = typeof payload.url === 'string' ? payload.url.trim() : ''
  const categoryId = typeof payload.categoryId === 'string' ? payload.categoryId : state.categories[0]?.id
  if (!name || !url || !categoryId) throw new Error('site.create 需要 name、url 和 categoryId。')
  const item: NavSite = {
    id: ensureUniqueId(slugify(name), state.sites.map((site) => site.id), 'site'),
    categoryId,
    name,
    url,
    description: typeof payload.description === 'string' ? payload.description : '',
    icon: typeof payload.icon === 'string' ? payload.icon : 'Sparkles',
    tags: Array.isArray(payload.tags) ? payload.tags.filter((tag): tag is string => typeof tag === 'string') : [],
    sortOrder: Math.max(0, ...state.sites.filter((site) => site.categoryId === categoryId).map((site) => site.sortOrder)) + 1,
    isVisible: typeof payload.isVisible === 'boolean' ? payload.isVisible : true,
    isPrivate: typeof payload.isPrivate === 'boolean' ? payload.isPrivate : false,
    cardVariant: typeof payload.cardVariant === 'string' ? payload.cardVariant as NavSite['cardVariant'] : undefined,
  }
  state.sites = [...state.sites, item]
  return [item.id]
}

function updateSite(state: AppState, payload: Record<string, unknown>) {
  const id = typeof payload.id === 'string' ? payload.id : ''
  if (!id) throw new Error('site.update 需要 id。')
  const idx = state.sites.findIndex((site) => site.id === id)
  if (idx < 0) throw new Error(`站点不存在：${id}`)
  const patch: Partial<NavSite> = {}
  if (typeof payload.categoryId === 'string') patch.categoryId = payload.categoryId
  if (typeof payload.name === 'string') patch.name = payload.name.trim()
  if (typeof payload.url === 'string') patch.url = payload.url.trim()
  if (typeof payload.description === 'string') patch.description = payload.description
  if (typeof payload.icon === 'string') patch.icon = payload.icon
  if (Array.isArray(payload.tags)) patch.tags = payload.tags.filter((tag): tag is string => typeof tag === 'string')
  if (typeof payload.isVisible === 'boolean') patch.isVisible = payload.isVisible
  if (typeof payload.isPrivate === 'boolean') patch.isPrivate = payload.isPrivate
  if (typeof payload.cardVariant === 'string') patch.cardVariant = payload.cardVariant as NavSite['cardVariant']
  state.sites = state.sites.map((site) => (site.id === id ? { ...site, ...patch, id } : site))
  return Object.keys(patch)
}

function deleteSite(state: AppState, payload: Record<string, unknown>) {
  const id = typeof payload.id === 'string' ? payload.id : ''
  if (!id) throw new Error('site.delete 需要 id。')
  const before = state.sites.length
  state.sites = state.sites.filter((site) => site.id !== id)
  if (state.sites.length === before) throw new Error(`站点不存在：${id}`)
  return [id]
}

function createCategory(state: AppState, payload: Record<string, unknown>) {
  const name = typeof payload.name === 'string' ? payload.name.trim() : ''
  if (!name) throw new Error('category.create 需要 name。')
  const item: NavCategory = {
    id: ensureUniqueId(slugify(name), state.categories.map((category) => category.id), 'cat'),
    name,
    icon: typeof payload.icon === 'string' ? payload.icon : 'Sparkles',
    description: typeof payload.description === 'string' ? payload.description : '',
    sortOrder: Math.max(0, ...state.categories.map((category) => category.sortOrder)) + 1,
    isVisible: typeof payload.isVisible === 'boolean' ? payload.isVisible : true,
  }
  state.categories = [...state.categories, item]
  return [item.id]
}

function updateCategory(state: AppState, payload: Record<string, unknown>) {
  const id = typeof payload.id === 'string' ? payload.id : ''
  if (!id) throw new Error('category.update 需要 id。')
  const target = state.categories.find((category) => category.id === id)
  if (!target) throw new Error(`分类不存在：${id}`)
  const patch: Partial<NavCategory> = {}
  if (typeof payload.name === 'string') patch.name = payload.name.trim()
  if (typeof payload.icon === 'string') patch.icon = payload.icon
  if (typeof payload.description === 'string') patch.description = payload.description
  if (typeof payload.isVisible === 'boolean') patch.isVisible = payload.isVisible
  state.categories = state.categories.map((category) => (category.id === id ? { ...category, ...patch, id } : category))
  return Object.keys(patch)
}

function deleteCategory(state: AppState, payload: Record<string, unknown>) {
  const id = typeof payload.id === 'string' ? payload.id : ''
  if (!id) throw new Error('category.delete 需要 id。')
  const before = state.categories.length
  state.categories = state.categories.filter((category) => category.id !== id)
  if (state.categories.length === before) throw new Error(`分类不存在：${id}`)
  state.sites = state.sites.filter((site) => site.categoryId !== id)
  return [id]
}

function reorder<T extends { id: string; sortOrder: number }>(items: T[], id: string, direction: -1 | 1, filter?: (item: T) => boolean) {
  const peers = [...(filter ? items.filter(filter) : items)].sort((a, b) => a.sortOrder - b.sortOrder)
  const idx = peers.findIndex((item) => item.id === id)
  if (idx < 0) throw new Error(`项目不存在：${id}`)
  const targetIdx = idx + direction
  if (targetIdx < 0 || targetIdx >= peers.length) return []
  const a = peers[idx]
  const b = peers[targetIdx]
  const next = items.map((item) => ({ ...item }))
  const nextA = next.find((item) => item.id === a.id)
  const nextB = next.find((item) => item.id === b.id)
  if (nextA && nextB) {
    const order = nextA.sortOrder
    nextA.sortOrder = nextB.sortOrder
    nextB.sortOrder = order
  }
  return next
}

function runCommand(state: AppState, action: string, payload: Record<string, unknown>, scopes: AiScope[]) {
  const settingsActions = new Set(['settings.update', 'basic.update', 'footer.update', 'theme.update', 'background.update', 'cards.update'])
  if (settingsActions.has(action)) {
    requireScope(scopes, 'appearance:write')
    return patchSettings(state, payload)
  }

  const contentActions = new Set([
    'site.create', 'site.update', 'site.delete', 'site.reorder', 'site.visibility.update',
    'category.create', 'category.update', 'category.delete', 'category.reorder', 'category.visibility.update',
  ])
  if (contentActions.has(action)) requireScope(scopes, 'content:write')

  switch (action) {
    case 'site.create': return createSite(state, payload)
    case 'site.update': return updateSite(state, payload)
    case 'site.delete': return deleteSite(state, payload)
    case 'site.visibility.update': return updateSite(state, { ...payload, isVisible: payload.isVisible })
    case 'site.reorder': {
      const id = typeof payload.id === 'string' ? payload.id : ''
      const direction = payload.direction === 'up' ? -1 : payload.direction === 'down' ? 1 : null
      if (!id || direction === null) throw new Error('site.reorder 需要 id 和 direction: up/down。')
      const target = state.sites.find((site) => site.id === id)
      if (!target) throw new Error(`站点不存在：${id}`)
      state.sites = reorder(state.sites, id, direction, (site) => site.categoryId === target.categoryId)
      return [id]
    }
    case 'category.create': return createCategory(state, payload)
    case 'category.update': return updateCategory(state, payload)
    case 'category.delete': return deleteCategory(state, payload)
    case 'category.visibility.update': return updateCategory(state, { ...payload, isVisible: payload.isVisible })
    case 'category.reorder': {
      const id = typeof payload.id === 'string' ? payload.id : ''
      const direction = payload.direction === 'up' ? -1 : payload.direction === 'down' ? 1 : null
      if (!id || direction === null) throw new Error('category.reorder 需要 id 和 direction: up/down。')
      state.categories = reorder(state.categories, id, direction)
      return [id]
    }
    default:
      throw new Error(`暂不支持的 action：${action}`)
  }
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const db = requireDb(env)
  if (!db) return json({ ok: false, error: 'D1 binding DB is not configured' }, { status: 503 })

  const auth = await authenticate(db, request)
  if (auth instanceof Response) return auth
  const { key, scopes } = auth

  let command: z.infer<typeof commandSchema>
  try {
    command = commandSchema.parse(await request.json())
  } catch (error) {
    await writeAudit(db, key, 'unknown', 'error', '请求格式错误。', null)
    return json({ ok: false, error: error instanceof Error ? error.message : 'Bad request' }, { status: 400 })
  }

  try {
    const state = await loadState(db)
    const changed = runCommand(state, command.action, command.payload, scopes)
    await saveState(db, state)
    await db.prepare('UPDATE ai_keys SET last_used_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(key.id).run()
    await writeAudit(db, key, command.action, 'success', `${command.action} 已执行。`, { payload: command.payload, changed })
    return json({ ok: true, result: 'success', action: command.action, changed })
  } catch (error) {
    if (error instanceof Response) return error
    const message = error instanceof Error ? error.message : 'Command failed'
    const status = message.includes('不允许') || message.includes('暂不支持') || message.includes('不存在') ? 403 : 400
    await writeAudit(db, key, command.action, status === 403 ? 'blocked' : 'error', message, command.payload)
    return json({ ok: false, result: status === 403 ? 'blocked' : 'error', error: message }, { status })
  }
}
