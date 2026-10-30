// Sample AI agents and what each may see through the MCP server. Mock data, kept in localStorage.
import { useSyncExternalStore } from 'react'
import { SEMANTIC } from './semantic'
import { getStored } from './store'
import { d2cMetrics } from './mock'
import { D2C_CONTEXT } from './context'

export type Part = 'tables' | 'metrics' | 'filters' | 'rules' | 'queries' | 'context'
export const PARTS: { id: Part; label: string }[] = [{ id: 'tables', label: 'Tables and fields' }, { id: 'metrics', label: 'Metrics' }, { id: 'filters', label: 'Filters' }, { id: 'rules', label: 'Rules' }, { id: 'queries', label: 'Verified queries' }, { id: 'context', label: 'Business context' }]
export const TOOLS: { id: string; desc: string; needs: Part[]; note?: string }[] = [
  { id: 'search_context', desc: 'Find the tables, fields, filters and rules that matter for a question.', needs: ['tables', 'filters', 'rules'] },
  { id: 'list_metrics', desc: 'List the approved metrics with what they mean.', needs: ['metrics'] },
  { id: 'get_metric', desc: 'Explain one metric: its meaning, synonyms and when to use it.', needs: ['metrics'] },
  { id: 'compile_sql', desc: 'Build the SQL for a metric, with the safe-division guard.', needs: ['metrics'], note: 'Returns SQL only. The agent runs it itself under its own read-only role.' },
  { id: 'get_verified_queries', desc: 'Return approved question and SQL pairs close to a question.', needs: ['queries'] },
  { id: 'get_business_context', desc: 'Return the business context and the glossary.', needs: ['context'] },
]
export type Agent = {
  id: string; name: string; owner: string; status: 'connected' | 'paused' | 'draft'; views: Record<string, Part[]>; tools: string[]
  version: string; limit: number; keyHint: string; callsToday: number; lastCall: string
}
const ALL = PARTS.map((p) => p.id)
const seed = (): Agent[] => [
  { id: 'ecom', name: 'D2C analyst agent', owner: 'E-commerce team', status: 'connected', views: { d2c: ALL }, tools: TOOLS.map((t) => t.id), version: 'live', limit: 2000, keyHint: 'sx_live_••••3f2a', callsToday: 142, lastCall: '2 min ago' },
  { id: 'retail', name: 'Retail agent', owner: 'Retail team', status: 'draft', views: { d2c: ['metrics', 'filters', 'rules', 'context'] }, tools: ['list_metrics', 'get_metric', 'get_business_context'], version: 'live', limit: 500, keyHint: 'not created yet', callsToday: 0, lastCall: 'never' },
  { id: 'b2b', name: 'B2B agent', owner: 'B2B team', status: 'draft', views: {}, tools: ['search_context', 'list_metrics'], version: 'live', limit: 500, keyHint: 'not created yet', callsToday: 0, lastCall: 'never' },
]
let agents: Agent[] = (() => { try { const r = localStorage.getItem('sx-agents'); if (r) return JSON.parse(r) as Agent[] } catch { /* seed */ } return seed() })()
const subs = new Set<() => void>()
const commit = (a: Agent[]) => { agents = a; try { localStorage.setItem('sx-agents', JSON.stringify(a)) } catch { /* memory only */ } subs.forEach((f) => f()) }
export const useAgents = () => useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f) } }, () => agents)
export const updateAgent = (id: string, patch: Partial<Agent>) => commit(agents.map((a) => (a.id === id ? { ...a, ...patch } : a)))
export const addAgent = (a: Pick<Agent, 'name' | 'owner' | 'views'>) => { const id = `a${Date.now()}`; commit([...agents, { id, ...a, status: 'draft', tools: TOOLS.map((t) => t.id), version: 'live', limit: 500, keyHint: 'not created yet', callsToday: 0, lastCall: 'never' }]); return id }
export const removeAgent = (id: string) => commit(agents.filter((a) => a.id !== id))
export const resetAgents = () => commit(seed())

const rnd = () => Array.from({ length: 24 }, () => 'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 36)]).join('')
/** A sample key, shown once. The prototype keeps only the masked end. */
export function newKey(): { full: string; hint: string } { const full = `sx_live_${rnd()}`; return { full, hint: `sx_live_••••${full.slice(-4)}` } }

// ---- what a view contributes (rough size in tokens: characters / 4; restricted fields never counted) ----
const tok = (x: unknown) => Math.round(JSON.stringify(x).length / 4 / 50) * 50
export type ViewSize = { part: Part; items: number; tokens: number; sample: string[] }
export function viewSizes(viewId: string): ViewSize[] {
  const st = viewId === 'd2c' ? null : getStored(viewId)
  const sem = viewId === 'd2c' ? SEMANTIC : st?.semantic
  if (!sem) return []
  const metrics = viewId === 'd2c' ? d2cMetrics() : st?.metrics ?? []
  const ctx = viewId === 'd2c' ? D2C_CONTEXT : st?.context ?? { sections: [], glossary: [] }
  const fields = sem.tables.flatMap((t) => t.fields.filter((f) => !f.restricted).map((f) => ({ n: f.name, k: f.kind, d: f.description, s: f.synonyms })))
  return [
    { part: 'tables', items: fields.length, tokens: tok(fields), sample: sem.tables.map((t) => t.label) },
    { part: 'metrics', items: metrics.length, tokens: tok(metrics.map((m) => [m.name, m.description, m.synonyms, m.useWhen, m.expression])), sample: metrics.map((m) => m.title) },
    { part: 'filters', items: sem.filters.length, tokens: tok(sem.filters.map((f) => [f.label, f.meaning, f.synonyms])), sample: sem.filters.map((f) => f.label) },
    { part: 'rules', items: sem.rules.length, tokens: tok(sem.rules.map((r) => [r.title, r.body])), sample: sem.rules.map((r) => r.title) },
    { part: 'queries', items: sem.questions.length, tokens: tok(sem.questions.map((q) => [q.text, q.sql])), sample: sem.questions.map((q) => q.text) },
    { part: 'context', items: ctx.sections.length + ctx.glossary.length, tokens: tok([ctx.sections, ctx.glossary]), sample: ctx.sections.map((s) => s.title) },
  ]
}
export const restrictedCount = (viewId: string) => (viewId === 'd2c' ? SEMANTIC : getStored(viewId)?.semantic)?.tables.flatMap((t) => t.fields).filter((f) => f.restricted).length ?? 0
export function agentTokens(a: Agent) { return Object.entries(a.views).reduce((sum, [v, parts]) => sum + viewSizes(v).filter((s) => parts.includes(s.part)).reduce((x, s) => x + s.tokens, 0), 0) }

// ---- sample activity ----
export type Call = { when: string; tool: string; view: string; ms: number; ok: boolean; note?: string }
export function activityOf(a: Agent): Call[] {
  if (a.status === 'draft') return []
  const views = Object.keys(a.views), tools = a.tools.length ? a.tools : ['list_metrics']
  const h = [...a.id].reduce((x, c) => (x * 31 + c.charCodeAt(0)) >>> 0, 7)
  const out: Call[] = Array.from({ length: 8 }, (_, i) => ({ when: `${2 + i * 7} min ago`, tool: tools[(h + i) % tools.length], view: views[0] ?? 'd2c', ms: 80 + ((h >> i) % 260), ok: true }))
  out.splice(3, 0, { when: '17 min ago', tool: 'get_metric', view: 'finance', ms: 12, ok: false, note: 'Denied: this view is not in the agent profile' })
  return out
}
