export interface Env {
  DB?: D1Database
  ADMIN_PASSWORD?: string
  ADMIN_SESSION_SECRET?: string
  AI_ADMIN_TOKEN?: string
  APP_NAME?: string
  PUBLIC_BG_API?: string
}

export function json(data: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    ...init,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...init.headers,
    },
  })
}

export function requireDb(env: Env): D1Database | null {
  return env.DB ?? null
}
