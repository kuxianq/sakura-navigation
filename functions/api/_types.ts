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

function parseCookies(header: string | null): Record<string, string> {
  const cookies: Record<string, string> = {}
  if (!header) return cookies
  for (const part of header.split(';')) {
    const [rawKey, ...rawValue] = part.trim().split('=')
    if (!rawKey) continue
    cookies[rawKey] = decodeURIComponent(rawValue.join('='))
  }
  return cookies
}

async function hmac(secret: string, value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value))
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export async function createAdminSession(env: Env): Promise<string> {
  const issuedAt = Date.now().toString()
  const signature = await hmac(env.ADMIN_SESSION_SECRET ?? '', issuedAt)
  return `${issuedAt}.${signature}`
}

export async function requireAdmin(request: Request, env: Env): Promise<boolean> {
  if (!env.ADMIN_SESSION_SECRET) return false
  const token = parseCookies(request.headers.get('cookie')).sn_admin
  if (!token) return false
  const [issuedAt, signature] = token.split('.')
  if (!issuedAt || !signature) return false
  const timestamp = Number(issuedAt)
  if (!Number.isFinite(timestamp)) return false
  const maxAgeMs = 1000 * 60 * 60 * 24 * 7
  if (Date.now() - timestamp > maxAgeMs) return false
  const expected = await hmac(env.ADMIN_SESSION_SECRET, issuedAt)
  return signature === expected
}

export function setCookie(name: string, value: string): string {
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800`
}

export function clearCookie(name: string): string {
  return `${name}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`
}
