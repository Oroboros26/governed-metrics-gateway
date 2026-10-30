// Sample people and access for the prototype. Scope follows the warehouse role of the analyst; business users get a subset of it.
import { SEMANTIC } from './semantic'

export type PRole = 'engineer' | 'analyst' | 'business'
export type Person = { id: string; name: string; email: string; role: PRole; parent?: string; views: string[]; tables: string[]; whRole?: string; status: 'active' | 'invited'; since: string }
const D2C = SEMANTIC.tables.map((t) => t.source)
export const ROLE_TABLES: Record<string, string[]> = {
  ECOM_ANALYST: [...D2C, 'ANALYTIC_F_STORE_FOOTFALL', 'ANALYTIC_D_CALENDAR', 'ANALYTIC_F_PROMOTIONS'],
  FIN_ANALYST: ['FIN_F_INVOICES', 'FIN_D_COST_CENTRES', 'FIN_F_PAYMENTS', 'FIN_F_BUDGET', 'FIN_D_ACCOUNTS', 'FIN_F_ACCRUALS'],
  WHOLESALE_ANALYST: ['WS_F_SELL_IN', 'WS_D_ACCOUNTS', 'WS_F_FORECAST', 'WS_D_DOORS', 'WS_F_RETURNS'],
}
export const ALL_TABLES = Object.values(ROLE_TABLES).flat()

const seed = (): Person[] => [
  { id: 'ravi', name: 'Ravi', email: 'ravi@example.com', role: 'engineer', views: ['d2c', 'finance', 'wholesale'], tables: ALL_TABLES, status: 'active', since: 'Jun 2026' },
  { id: 'noa', name: 'Noa', email: 'noa@example.com', role: 'analyst', parent: 'ravi', views: ['d2c'], tables: ROLE_TABLES.ECOM_ANALYST, whRole: 'ECOM_ANALYST', status: 'active', since: 'Jun 2026' },
  { id: 'mina', name: 'Mina', email: 'mina@example.com', role: 'analyst', parent: 'ravi', views: ['finance'], tables: ROLE_TABLES.FIN_ANALYST, whRole: 'FIN_ANALYST', status: 'active', since: 'Aug 2026' },
  { id: 'jean', name: 'Jean', email: 'jean@example.com', role: 'business', parent: 'noa', views: ['d2c'], tables: ROLE_TABLES.ECOM_ANALYST, status: 'active', since: 'Jun 2026' },
  { id: 'lea', name: 'Léa', email: 'lea@example.com', role: 'business', parent: 'noa', views: ['d2c'], tables: D2C, status: 'active', since: 'Jul 2026' },
  { id: 'tom', name: 'Tom', email: 'tom@example.com', role: 'business', parent: 'noa', views: ['d2c'], tables: D2C.slice(0, 4), status: 'active', since: 'Sep 2026' },
  { id: 'sam', name: 'Sam', email: 'sam@example.com', role: 'business', parent: 'noa', views: ['d2c'], tables: D2C.slice(0, 4), status: 'invited', since: 'Today' },
  { id: 'chris', name: 'Chris', email: 'chris@example.com', role: 'business', parent: 'mina', views: ['finance'], tables: ROLE_TABLES.FIN_ANALYST.slice(0, 3), status: 'active', since: 'Sep 2026' },
]
let people: Person[] = (() => { try { const r = localStorage.getItem('sx-people'); if (r) return JSON.parse(r) as Person[] } catch { /* use the seed */ } return seed() })()
const save = () => { try { localStorage.setItem('sx-people', JSON.stringify(people)) } catch { /* kept in memory */ } }
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export const listPeople = async () => { await sleep(250); return [...people] }
export async function invite(p: Omit<Person, 'id' | 'status' | 'since'>) {
  await sleep(500)
  people = [...people, { ...p, id: `${p.name.toLowerCase().replace(/\W+/g, '')}${people.length}`, status: 'invited', since: 'Today' }]; save()
}
export async function setScope(id: string, tables: string[]) { await sleep(400); people = people.map((p) => (p.id === id ? { ...p, tables } : p)); save() }
export async function removePerson(id: string) { await sleep(400); people = people.filter((p) => p.id !== id && p.parent !== id); save() }
