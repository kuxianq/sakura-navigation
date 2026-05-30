import type { NavSite } from '../types/navigation'

export function uniqueStrings(values: unknown[]): string[] {
  return [...new Set(values.filter((value): value is string => typeof value === 'string' && value.trim().length > 0).map((value) => value.trim()))]
}

export function getSiteCategoryIds(site: Pick<NavSite, 'categoryId' | 'categoryIds'>): string[] {
  return normalizeCategoryIds(site.categoryId, site.categoryIds)
}

export function normalizeCategoryIds(primaryCategoryId: string, categoryIds?: unknown): string[] {
  const primary = primaryCategoryId.trim()
  const extra = Array.isArray(categoryIds) ? uniqueStrings(categoryIds) : []
  return uniqueStrings([primary, ...extra])
}

export function siteBelongsToCategory(site: Pick<NavSite, 'categoryId' | 'categoryIds'>, categoryId: string): boolean {
  return getSiteCategoryIds(site).includes(categoryId)
}

export function normalizeSiteCategories<T extends Pick<NavSite, 'categoryId' | 'categoryIds'>>(site: T): T {
  return {
    ...site,
    categoryIds: getSiteCategoryIds(site),
  }
}

export function removeCategoryFromSite(site: NavSite, categoryId: string): NavSite | null {
  if (site.categoryId === categoryId) return null
  return {
    ...site,
    categoryIds: getSiteCategoryIds(site).filter((id) => id !== categoryId),
  }
}
