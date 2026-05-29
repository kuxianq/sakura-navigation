import { json, requireDb, setCookie, createAdminSession, type Env } from '../_types'

async function readStoredAdminPassword(env: Env): Promise<string | null> {
  const db = requireDb(env)
  if (!db) return null
  const row = await db
    .prepare('SELECT value_json FROM app_state WHERE key = ?')
    .bind('app')
    .first<{ value_json: string }>()
  if (!row) return null
  try {
    const state = JSON.parse(row.value_json) as { settings?: { adminPassword?: unknown } }
    const password = state.settings?.adminPassword
    return typeof password === 'string' && password.trim() ? password : null
  } catch {
    return null
  }
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.ADMIN_SESSION_SECRET) {
    return json({ ok: false, error: 'Admin session is not configured' }, { status: 503 })
  }

  const input = await request.json().catch(() => null) as { password?: unknown } | null
  const password = typeof input?.password === 'string' ? input.password : ''
  const expectedPassword = await readStoredAdminPassword(env) ?? env.ADMIN_PASSWORD

  if (!expectedPassword) {
    return json({ ok: false, error: 'Admin password is not configured' }, { status: 503 })
  }

  if (password !== expectedPassword) {
    return json({ ok: false, error: 'Invalid password' }, { status: 401 })
  }

  const cookie = await createAdminSession(env)
  return json({ ok: true }, { headers: { 'set-cookie': setCookie('sn_admin', cookie) } })
}
