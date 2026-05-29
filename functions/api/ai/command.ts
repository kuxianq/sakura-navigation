import { z } from 'zod'
import { json, requireDb, type Env } from '../_types'

const commandSchema = z.object({
  action: z.enum(['site.create', 'category.create', 'settings.update']),
  payload: z.record(z.string(), z.unknown()),
})

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!env.AI_ADMIN_TOKEN || token !== env.AI_ADMIN_TOKEN) {
    return json({ error: 'Unauthorized' }, { status: 401 })
  }
  const db = requireDb(env)
  if (!db) return json({ error: 'D1 binding DB is not configured' }, { status: 503 })

  const command = commandSchema.parse(await request.json())
  const auditId = crypto.randomUUID()
  await db.prepare('INSERT INTO audit_logs (id, actor, action, target_type, after_json) VALUES (?, ?, ?, ?, ?)')
    .bind(auditId, 'ai', command.action, command.action.split('.')[0], JSON.stringify(command.payload))
    .run()

  return json({ ok: true, auditId, accepted: command.action })
}
