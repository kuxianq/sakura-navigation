import { json } from '../api/_types'

export const onRequest: PagesFunction = async () => {
  return json({ ok: false, error: 'Removed' }, { status: 410 })
}
