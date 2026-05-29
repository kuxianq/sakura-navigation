import { z } from 'zod'
import { json, requireAdmin, requireDb, sha256Hex, type Env } from '../_types'

const scopeSchema = z.enum(['content:read', 'content:write', 'appearance:read', 'appearance:write', 'ops:read', 'audit:read'])

const createKeySchema = z.object({
  name: z.string().trim().min(1).max(80),
  scopes: z.array(scopeSchema).min(1),
})

function makeId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`
}

function makeSecret() {
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  return `sk_nav_${Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')}`
}

function prefixOf(secret: string) {
  return secret.slice(0, 18)
}

function normalizeKey(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    name: String(row.name),
    prefix: String(row.prefix),
    scopes: JSON.parse(String(row.scopes_json || '[]')) as string[],
    isActive: Boolean(row.is_active),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    lastUsedAt: row.last_used_at ? String(row.last_used_at) : undefined,
  }
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  if (!await requireAdmin(request, env)) return json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  const db = requireDb(env)
  if (!db) return json({ ok: false, error: 'D1 binding DB is not configured' }, { status: 503 })

  const { results } = await db
    .prepare('SELECT id, name, prefix, scopes_json, is_active, created_at, updated_at, last_used_at FROM ai_keys ORDER BY created_at DESC')
    .all<Record<string, unknown>>()

  return json({ ok: true, items: results.map(normalizeKey) })
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!await requireAdmin(request, env)) return json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  const db = requireDb(env)
  if (!db) return json({ ok: false, error: 'D1 binding DB is not configured' }, { status: 503 })

  const input = createKeySchema.parse(await request.json())
  const secret = makeSecret()
  const prefix = prefixOf(secret)
  const hash = await sha256Hex(secret)
  const id = makeId('key')
  const scopesJson = JSON.stringify(input.scopes)

  await db.prepare(`INSERT INTO ai_keys (id, name, prefix, key_hash, scopes_json, is_active)
    VALUES (?, ?, ?, ?, ?, 1)`)
    .bind(id, input.name, prefix, hash, scopesJson)
    .run()

  await db.prepare('INSERT INTO audit_logs (id, actor, action, target_type, target_id, after_json) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(makeId('audit'), 'admin', 'key.create', 'ai_key', id, JSON.stringify({ name: input.name, prefix, scopes: input.scopes }))
    .run()

  return json({ ok: true, item: { id, name: input.name, prefix, scopes: input.scopes, isActive: true, createdAt: new Date().toISOString() }, secret }, { status: 201 })
}
