import { z } from 'zod'
import { json, requireDb, type Env } from '../_types'

const siteSchema = z.object({
  id: z.string().min(1),
  categoryId: z.string().min(1),
  name: z.string().min(1),
  url: z.string().url(),
  description: z.string().default(''),
  icon: z.string().default('Sparkles'),
  sortOrder: z.number().int().default(0),
  isVisible: z.boolean().default(true),
  isPrivate: z.boolean().default(false),
  cardVariant: z.enum(['glass', 'float', 'solid', 'minimal']).default('glass'),
  metadata: z.record(z.string(), z.unknown()).default({}),
})

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const db = requireDb(env)
  if (!db) return json({ error: 'D1 binding DB is not configured', items: [] }, { status: 503 })
  const { results } = await db.prepare('SELECT * FROM sites ORDER BY sort_order ASC, name ASC').all()
  return json({ items: results })
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const db = requireDb(env)
  if (!db) return json({ error: 'D1 binding DB is not configured' }, { status: 503 })
  const input = siteSchema.parse(await request.json())
  await db.prepare(`INSERT INTO sites (id, category_id, name, url, description, icon, sort_order, is_visible, is_private, card_variant, metadata_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(input.id, input.categoryId, input.name, input.url, input.description, input.icon, input.sortOrder, input.isVisible ? 1 : 0, input.isPrivate ? 1 : 0, input.cardVariant, JSON.stringify(input.metadata))
    .run()
  return json({ ok: true, item: input }, { status: 201 })
}
