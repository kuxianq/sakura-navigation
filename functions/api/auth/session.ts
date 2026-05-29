import { json, requireAdmin, type Env } from '../_types'

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  return json({ authenticated: await requireAdmin(request, env) })
}
