// Local-only id helpers. Stable enough for in-session local CRUD; not for persistence.

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\u4e00-\u9fff\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export function shortId(prefix = 'id'): string {
  const rand = Math.random().toString(36).slice(2, 8)
  const time = Date.now().toString(36).slice(-4)
  return `${prefix}-${time}${rand}`
}

export function ensureUniqueId(base: string, existing: Iterable<string>, fallbackPrefix = 'item'): string {
  const seen = new Set(existing)
  const candidate = base && base.length > 0 ? base : shortId(fallbackPrefix)
  if (!seen.has(candidate)) return candidate
  let n = 2
  while (seen.has(`${candidate}-${n}`)) n += 1
  return `${candidate}-${n}`
}
