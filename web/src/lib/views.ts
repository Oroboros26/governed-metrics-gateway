// Semantic views the signed-in user can open. D2C is built in with sample content; the others start empty and are filled by importing a YAML file.
import { getCustomViews, getStored } from './store'
export type ViewInfo = { id: string; name: string; full: string; description: string; owner: string; updated: string; builtin?: boolean }
const BUILTIN: ViewInfo[] = [
  { id: 'd2c', name: 'D2C', full: 'D2C Semantic View', description: 'Direct-to-consumer sales: orders, returns, products, shops and consumers.', owner: 'Data Platform', updated: '21 Oct 2026', builtin: true },
  { id: 'finance', name: 'Finance', full: 'Finance Semantic View', description: 'Finance reporting. Import a YAML file to fill it.', owner: 'Finance IT', updated: '—', builtin: true },
  { id: 'wholesale', name: 'Wholesale', full: 'Wholesale Semantic View', description: 'Wholesale and B2B sales. Import a YAML file to fill it.', owner: 'B2B team', updated: '—', builtin: true },
]
export const getViews = () => [...BUILTIN, ...getCustomViews()]
export const findView = (id?: string) => getViews().find((v) => v.id === id)
/** True when the view has content (D2C always does; others after an import or "start from scratch"). */
export const hasData = (id: string) => id === 'd2c' || getStored(id) !== null

export const SECTIONS = [
  { id: 'overview', label: 'Overview', icon: 'overview' },
  { id: 'tables', label: 'Tables', icon: 'table' },
  { id: 'metrics', label: 'Metrics', icon: 'chart' },
  { id: 'filters', label: 'Filters', icon: 'filter' },
  { id: 'rules', label: 'Rules', icon: 'book' },
  { id: 'queries', label: 'Verified queries', icon: 'verified' },
] as const
export type SectionId = (typeof SECTIONS)[number]['id'] | 'context'

export const path = {
  section: (view: string, section: string, params?: Record<string, string>) => `/app/v/${view}/${section}${params && Object.keys(params).length ? '?' + new URLSearchParams(params) : ''}`,
  metric: (view: string, name: string) => `/app/v/${view}/metrics/${name}`,
  edit: (view: string, name: string) => `/app/v/${view}/metrics/${name}/edit`,
  newMetric: (view: string) => `/app/v/${view}/new`,
}
