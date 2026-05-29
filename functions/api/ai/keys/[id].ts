import { z } from 'zod'
import { json, requireAdmin, requireDb, type Env } from '../../_types'

const patchSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  scopes: z.array(z.enum(['content:read', 'content:write', 'appearance:read', 'appearance:write', 'ops:read', 'audit:read'])).min(1).optional(),
  isActive: z.boolean().optional(),
})

function makeId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`
}

export const onRequestPatch: PagesFunction<Env> = async ({ request, env, params }) => {
  if (!await requireAdmin(request, env)) return json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  const db = requireDb(env)
  if (!db) return json({ ok: false, error: 'D1 binding DB is not configured' }, { status: 503 })

  const id = String(params.id || '')
  const input = patchSchema.parse(await request.json())
  const row = await db.prepare('SELECT id, name, prefix, scopes_json, is_active FROM ai_keys WHERE id = ?').bind(id).first<Record<string, unknown>>()
  if (!row) return json({ ok: false, error: 'Key not found' }, { status: 404 })

  const nextName = input.name ?? String(row.name)
  const nextScopes = input.scopes ?? JSON.parse(String(row.scopes_json || '[]'))
  const nextActive = typeof input.isActive === 'boolean' ? input.isActive : Boolean(row.is_active)

  await db.prepare('UPDATE ai_keys SET name = ?, scopes_json = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .bind(nextName, JSON.stringify(nextScopes), nextActive ? 1 : 0, id)
    .run()

  await db.prepare('INSERT INTO audit_logs (id, actor, action, target_type, target_id, before_json, after_json) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(
      makeId('audit'),
      'admin',
      nextActive ? 'key.update' : 'key.disable',
      'ai_key',
      id,
      JSON.stringify({ name: row.name, scopes: JSON.parse(String(row.scopes_json || '[]')), isActive: Boolean(row.is_active) }),
      JSON.stringify({ name: nextName, scopes: nextScopes, isActive: nextActive }),
    )
    .run()

  return json({ ok: true })
}

export const onRequestDelete: PagesFunction<Env> = async ({ request, env, params }) => {
  if (!await requireAdmin(request, env)) return json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  const db = requireDb(env)
  if (!db) return json({ ok: false, error: 'D1 binding DB is not configured' }, { status: 503 })

  const id = String(params.id || '')
  const row = await db.prepare('SELECT id, name, prefix, scopes_json, is_active FROM ai_keys WHERE id = ?').bind(id).first<Record<string, unknown>>()
  if (!row) return json({ ok: false, error: 'Key not found' }, { status: 404 })

  await db.prepare('DELETE FROM ai_keys WHERE id = ?').bind(id).run()
  await db.prepare('INSERT INTO audit_logs (id, actor, action, target_type, target_id, before_json) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(makeId('audit'), 'admin', 'key.delete', 'ai_key', id, JSON.stringify(row))
    .run()

  return json({ ok: true })
}
