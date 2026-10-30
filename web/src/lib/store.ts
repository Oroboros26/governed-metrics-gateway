// Browser-only storage for imported semantic views (localStorage). Nothing is sent anywhere.
import { useSyncExternalStore } from 'react'
import type { SemanticView } from './semantic'
import type { Metric } from './mock'
import type { ViewContext } from './context'
import type { ViewInfo } from './views'

export type StoredView = { semantic: SemanticView; metrics: Metric[]; context: ViewContext; importedAt: string; source: string }

let version = 0
const subs = new Set<() => void>()
const bump = () => { version++; subs.forEach((f) => f()) }
export const useStoreVersion = () => useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f) } }, () => version)

const cache = new Map<string, StoredView | null>()
export function getStored(id: string): StoredView | null {
  if (cache.has(id)) return cache.get(id) ?? null
  let v: StoredView | null = null
  try { const r = localStorage.getItem(`sx-data-${id}`); v = r ? (JSON.parse(r) as StoredView) : null } catch { v = null }
  cache.set(id, v)
  return v
}
/** Returns an error message, or null when saved. */
export function saveStored(id: string, data: StoredView): string | null {
  try { localStorage.setItem(`sx-data-${id}`, JSON.stringify(data)) } catch { return 'Your browser could not store this view (storage is full or blocked). Try a smaller file.' }
  cache.set(id, data); bump(); return null
}
export function clearStored(id: string) {
  try { localStorage.removeItem(`sx-data-${id}`) } catch { /* nothing to remove */ }
  cache.set(id, null); bump()
}

let custom: ViewInfo[] | null = null
export function getCustomViews(): ViewInfo[] {
  if (custom) return custom
  try { custom = JSON.parse(localStorage.getItem('sx-views') ?? '[]') as ViewInfo[] } catch { custom = [] }
  return custom
}
export function addCustomView(v: ViewInfo) {
  custom = [...getCustomViews(), v]
  try { localStorage.setItem('sx-views', JSON.stringify(custom)) } catch { /* kept in memory for this session */ }
  bump()
}
