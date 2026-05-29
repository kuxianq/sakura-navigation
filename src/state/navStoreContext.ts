import { createContext, useContext } from 'react'
import type { AiAuditLog, AiCommandResult, AiKeyRecord, AiScope, NavCategory, NavSite, ThemeSettings } from '../types/navigation'

export type CategoryDraft = Partial<NavCategory> & { name: string }
export type SiteDraft = Partial<NavSite> & {
  name: string
  url: string
  categoryId: string
}

export interface AiKeyDraft {
  name: string
  scopes: AiScope[]
}

export interface NavStore {
  categories: NavCategory[]
  sites: NavSite[]
  settings: ThemeSettings
  aiKeys: AiKeyRecord[]
  aiAuditLogs: AiAuditLog[]

  createCategory: (draft: CategoryDraft) => NavCategory
  updateCategory: (id: string, patch: Partial<NavCategory>) => void
  deleteCategory: (id: string) => void
  moveCategory: (id: string, direction: -1 | 1) => void

  createSite: (draft: SiteDraft) => NavSite
  updateSite: (id: string, patch: Partial<NavSite>) => void
  deleteSite: (id: string) => void
  moveSite: (id: string, direction: -1 | 1) => void

  updateSettings: (patch: Partial<ThemeSettings>) => void

  createAiKey: (draft: AiKeyDraft) => AiKeyRecord
  toggleAiKey: (id: string) => void
  deleteAiKey: (id: string) => void
  addAiAuditLog: (log: Omit<AiAuditLog, 'id' | 'createdAt'>) => void
  runAiCommand: (secret: string, action: string, payloadText: string) => AiCommandResult

  resetAll: () => void
}

export const NavStoreContext = createContext<NavStore | null>(null)

export function useNavStore(): NavStore {
  const ctx = useContext(NavStoreContext)
  if (!ctx) throw new Error('useNavStore must be used inside <NavStoreProvider>')
  return ctx
}
