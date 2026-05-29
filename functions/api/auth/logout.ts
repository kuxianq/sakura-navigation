import { json, clearCookie } from '../_types'

export const onRequestPost: PagesFunction = async () => {
  return json({ ok: true }, { headers: { 'set-cookie': clearCookie('sn_admin') } })
}
