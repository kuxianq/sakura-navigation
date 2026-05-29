import { z } from 'zod'
import { json, requireDb, type Env } from '../_types'

const categorySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  icon: z.string().default('Sparkles'),
  description: z.string().default(''),
  sortOrder: z.number().int().default(0),
  isVisible: z.boolean().default(true),
  metadata: z.record(z.string(), z.unknown()).default({}),
})

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const db = requireDb(env)
  if (!db) return json({ error: 'D1 binding DB is not configured', items: [] }, { status: 503 })
  const { results } = await db.prepare('SELECT * FROM categories ORDER BY sort_order ASC, name ASC').all()
  return json({ items: results })
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const db = requireDb(env)
  if (!db) return json({ error: 'D1 binding DB is not configured' }, { status: 503 })
  const input = categorySchema.parse(await request.json())
  await db.prepare(`INSERT INTO categories (id, name, icon, description, sort_order, is_visible, metadata_json)
    VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .bind(input.id, input.name, input.icon, input.description, input.sortOrder, input.isVisible ? 1 : 0, JSON.stringify(input.metadata))
    .run()
  return json({ ok: true, item: input }, { status: 201 })
}
