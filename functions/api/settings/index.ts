import { json, requireDb, type Env } from '../_types'

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const db = requireDb(env)
  if (!db) return json({ error: 'D1 binding DB is not configured', items: [] }, { status: 503 })
  const { results } = await db.prepare('SELECT key, value_json, updated_at FROM settings ORDER BY key ASC').all()
  return json({ items: results })
}
