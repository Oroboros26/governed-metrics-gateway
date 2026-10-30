import { getStored } from './store'
// Prototype data: everything here is sample data for the E-commerce Analyst's workspace.
// The async functions mirror what the real API will return, so wiring later only replaces this file.

export type Action = 'sum' | 'avg' | 'count' | 'distinct'
export type Def = { action: Action; column: string; per: string | null }

export const ACTIONS: { value: Action; label: string; phrase: string; fn: (c: string) => string }[] = [
  { value: 'sum', label: 'Add up', phrase: 'Total of', fn: (c) => `SUM(${c})` },
  { value: 'avg', label: 'Average', phrase: 'Average of', fn: (c) => `AVG(${c})` },
  { value: 'count', label: 'Count', phrase: 'Count of', fn: (c) => `COUNT(${c})` },
  { value: 'distinct', label: 'Count unique', phrase: 'Number of unique', fn: (c) => `COUNT(DISTINCT ${c})` },
]

export const TABLES = ['fct_orders']

export const COLUMNS = [
  { key: 'order_id', label: 'Order ID', plain: 'orders', type: 'id', sql: 'order_id' },
  { key: 'item_price', label: 'Item price', plain: 'item price', type: 'number', sql: 'item_price' },
  { key: 'quantity', label: 'Quantity', plain: 'quantity', type: 'number', sql: 'quantity' },
  { key: 'line_revenue', label: 'Line revenue (price × quantity)', plain: 'line revenue', type: 'number', sql: 'item_price * quantity' },
  { key: 'returned_items_count', label: 'Items returned', plain: 'items returned', type: 'number', sql: 'returned_items_count' },
  { key: 'total_items_ordered', label: 'Items ordered', plain: 'items ordered', type: 'number', sql: 'total_items_ordered' },
]
const col = (k: string) => COLUMNS.find((c) => c.key === k)!
const act = (a: Action) => ACTIONS.find((x) => x.value === a)!

export const formulaOf = (d: Def) => act(d.action).fn(col(d.column).sql) + (d.per ? ` / ${act(d.action).fn(col(d.per).sql)}` : '')
export const englishOf = (d: Def) =>
  `${act(d.action).phrase} ${col(d.column).plain}` + (d.per ? `, divided by the ${act(d.action).phrase.toLowerCase()} ${col(d.per).plain}` : '')
export const sameDef = (a: Def, b: Def) => a.action === b.action && a.column === b.column && (a.per ?? null) === (b.per ?? null)

/** Friendly, immediate feedback for choices that can't work. */
export function validate(d: Def): string | null {
  const numeric = d.action === 'sum' || d.action === 'avg'
  for (const k of [d.column, d.per]) {
    if (k && numeric && col(k).type !== 'number')
      return `"${col(k).label}" is an identifier, not a number, so it can't be ${d.action === 'sum' ? 'added up' : 'averaged'}. Choose "Count" or "Count unique" instead.`
  }
  if (d.per && d.per === d.column) return 'The top and bottom of the division are the same column, so the answer would always be 1. Pick a different "divided by" column.'
  return null
}

export type Metric = {
  name: string; title: string; category: string; description: string; table: string
  def: Def; buildsOn: string[]; feeds: string[]; updated: string; synonyms?: string[]; useWhen?: string
  history: { v: number; date: string; by: string; note: string }[]
  imported?: boolean; expression?: string // imported metrics are shown read-only, with the expression from the file
}

const metrics: Metric[] = [
  {
    name: 'gross_revenue', title: 'Gross revenue', category: 'Sales', table: 'fct_orders',
    description: 'Total revenue from web orders before tax and discounts.',
    def: { action: 'sum', column: 'line_revenue', per: null },
    buildsOn: [], feeds: ['net_return_rate', 'average_order_value'], updated: '3 Oct 2026',
    synonyms: ['turnover', 'sales before tax'], useWhen: 'Asked about total sales, turnover or how much we sold.',
    history: [
      { v: 3, date: '3 Oct 2026', by: 'Data Platform', note: 'Now uses price × quantity per order line' },
      { v: 2, date: '14 Aug 2026', by: 'Jean', note: 'Clarified description' },
      { v: 1, date: '2 Jun 2026', by: 'Data Platform', note: 'First version' },
    ],
  },
  {
    name: 'net_return_rate', title: 'Net digital return rate', category: 'Returns', table: 'fct_orders',
    description: 'The share of ordered items that customers send back.',
    def: { action: 'sum', column: 'returned_items_count', per: 'total_items_ordered' },
    buildsOn: ['gross_revenue'], feeds: [], updated: '21 Sep 2026',
    synonyms: ['returns rate'], useWhen: 'Asked how much of what we sold comes back.',
    history: [
      { v: 2, date: '21 Sep 2026', by: 'Data Platform', note: 'Divide-by-zero protection added' },
      { v: 1, date: '2 Jun 2026', by: 'Data Platform', note: 'First version' },
    ],
  },
  {
    name: 'orders_count', title: 'Orders', category: 'Sales', table: 'fct_orders',
    description: 'The number of distinct web orders.',
    def: { action: 'distinct', column: 'order_id', per: null },
    buildsOn: [], feeds: ['average_order_value'], updated: '12 Oct 2026',
    synonyms: ['order volume', 'number of orders'], useWhen: 'Asked how many orders there were.',
    history: [{ v: 1, date: '12 Oct 2026', by: 'Jean', note: 'First version' }],
  },
  {
    name: 'average_order_value', title: 'Average order value', category: 'Sales', table: 'fct_orders',
    description: 'How much a typical web order is worth.',
    def: { action: 'sum', column: 'line_revenue', per: 'order_id' },
    buildsOn: ['gross_revenue', 'orders_count'], feeds: [], updated: '15 Oct 2026',
    synonyms: ['aov', 'basket size'], useWhen: 'Asked what a typical order is worth.',
    history: [
      { v: 2, date: '15 Oct 2026', by: 'Jean', note: 'Switched to order-level revenue' },
      { v: 1, date: '2 Jun 2026', by: 'Data Platform', note: 'First version' },
    ],
  },
]

export { listChanges, submitChange, suggestChange, type Change } from './workflow'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
export const listMetrics = async (viewId = 'd2c'): Promise<Metric[]> => { await sleep(500); return viewId === 'd2c' ? metrics : getStored(viewId)?.metrics ?? [] }
export const getMetric = async (name: string, viewId = 'd2c') => {
  await sleep(350)
  const m = (viewId === 'd2c' ? metrics : getStored(viewId)?.metrics ?? []).find((x) => x.name === name)
  if (!m) throw new Error('We could not find that metric.')
  return m
}

// ---- automatic 7-day test (simulated) ----
export type TestRow = { label: string; production: number | null; draft: number }
export type TestResult = { days: TestRow[]; total: TestRow; variance: number | null }

const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7)
const kindOf = (d: Def) => (d.per ? 'ratio' : d.action === 'sum' ? 'big' : d.action === 'avg' ? 'mid' : 'count')
function series(d: Def): number[] {
  const h = hash(`${d.action}|${d.column}|${d.per}`)
  const base = { ratio: 0.06 + (h % 80) / 1000, big: 70000 + (h % 30000), mid: 90 + (h % 80), count: 400 + (h % 300) }[kindOf(d)]
  return Array.from({ length: 7 }, (_, i) => base * (1 + 0.08 * Math.sin(i * 1.3 + h)))
}
const roll = (d: Def, v: number[]) => (kindOf(d) === 'big' || kindOf(d) === 'count' ? v.reduce((a, b) => a + b, 0) : v.reduce((a, b) => a + b, 0) / v.length)

export async function runTest(input: { name: string | null; draft: Def }): Promise<TestResult> {
  await sleep(1400)
  const base = input.name ? metrics.find((m) => m.name === input.name) : undefined
  const dv = series(input.draft)
  // Same definition as production -> same numbers; a changed one shifts by a repeatable factor.
  const factor = base && !sameDef(base.def, input.draft) ? 0.88 + (hash(formulaOf(input.draft)) % 25) / 100 : 1
  const pv = base ? series(base.def) : null
  const draftVals = base ? pv!.map((v) => v * factor) : dv
  const today = new Date()
  const days = draftVals.map((d, i) => {
    const dt = new Date(today.getTime() - (6 - i) * 86400000)
    return { label: dt.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }), production: pv ? pv[i] : null, draft: d }
  })
  const total = { label: '7-day total', production: pv && base ? roll(base.def, pv) : null, draft: roll(input.draft, draftVals) }
  const variance = total.production ? ((total.draft - total.production) / total.production) * 100 : null
  return { days, total, variance }
}

export const fmt = (v: number | null) =>
  v == null ? '-' : Math.abs(v) < 10 ? v.toLocaleString('en', { maximumFractionDigits: 4 }) : v.toLocaleString('en', { maximumFractionDigits: 0 })

/** The built-in D2C metrics, for sizing what an agent would receive. */
export const d2cMetrics = () => metrics
