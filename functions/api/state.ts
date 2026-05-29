import { json, requireAdmin, requireDb, type Env } from './_types'

const STATE_KEY = 'app'

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const db = requireDb(env)
  if (!db) return json({ ok: false, error: 'D1 binding DB is not configured' }, { status: 503 })

  const row = await db
    .prepare('SELECT value_json, updated_at FROM app_state WHERE key = ?')
    .bind(STATE_KEY)
    .first<{ value_json: string; updated_at: string }>()

  if (!row) return json({ ok: true, state: null, updatedAt: null })

  try {
    return json({ ok: true, state: JSON.parse(row.value_json), updatedAt: row.updated_at })
  } catch {
    return json({ ok: false, error: 'Stored state is not valid JSON' }, { status: 500 })
  }
}

export const onRequestPut: PagesFunction<Env> = async ({ request, env }) => {
  if (!await requireAdmin(request, env)) {
    return json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const db = requireDb(env)
  if (!db) return json({ ok: false, error: 'D1 binding DB is not configured' }, { status: 503 })

  const state = await request.json()
  await db
    .prepare(`INSERT INTO app_state (key, value_json, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = CURRENT_TIMESTAMP`)
    .bind(STATE_KEY, JSON.stringify(state))
    .run()

  return json({ ok: true })
}
