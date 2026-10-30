// Shared change workflow for the three roles (sample data, kept in localStorage so a request made as one role shows up for the others).
export type Stage = 'analyst_review' | 'sent_back' | 'mr_open' | 'live'
export type Tier = 'analyst' | 'engineering' // analyst: approved by the analyst alone; engineering: needs a merge request
export type CEvent = { when: string; text: string }
export type Change = {
  id: string; metric: string; title: string; action: 'create' | 'update'; status: 'in_review' | 'rejected' | 'live'
  submitted: string; note: string; reason?: string; kind?: 'metric' | 'description'
  view: string; by: string; area: string; tier: Tier; stage: Stage; tested: boolean; mrId?: string; events: CEvent[]
}
export type MR = { kind?: 'new_view'; viewId?: string; id: string; title: string; view: string; by: string; status: 'open' | 'merged' | 'closed'; opened: string; closed?: string; closedBy?: string; changeIds: string[]; comment?: string }
export type DiffLine = { t: 'ctx' | 'add' | 'del'; s: string }
export type DiffFile = { path: string; lines: DiffLine[] }

let actor = 'Jean'
export const setActor = (n: string) => { actor = n }
export const now = () => 'Just now'
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const ev = (when: string, text: string): CEvent => ({ when, text })

type State = { changes: Change[]; mrs: MR[]; seq: number }
const seed = (): State => ({
  seq: 20,
  changes: [
    { id: 'c1', metric: 'average_order_value', title: 'Average order value', action: 'update', status: 'in_review', submitted: 'Today, 09:42', note: 'Use unique orders instead of order lines.', view: 'd2c', by: 'Jean', area: 'Metric', tier: 'engineering', stage: 'analyst_review', tested: true, kind: 'metric', events: [ev('Today, 09:42', 'Submitted by Jean'), ev('Today, 09:43', '7-day test passed')] },
    { id: 'c5', metric: 'outlet_orders_only', title: 'Filter “Outlet orders only”', action: 'create', status: 'in_review', submitted: 'Today, 08:15', note: 'We often need to look at outlet shops only.', view: 'd2c', by: 'Jean', area: 'Filter', tier: 'engineering', stage: 'analyst_review', tested: false, kind: 'description', events: [ev('Today, 08:15', 'Submitted by Jean')] },
    { id: 'c4', metric: 'context', title: 'Business context › add block: Seasons and calendar', action: 'update', status: 'in_review', submitted: 'Today, 08:02', note: 'People ask about seasons and we have nothing written down.', view: 'd2c', by: 'Jean', area: 'Business context', tier: 'analyst', stage: 'analyst_review', tested: false, kind: 'description', events: [ev('Today, 08:02', 'Submitted by Jean')] },
    { id: 'c6', metric: 'net_sales_definition', title: 'Rule “Net sales”', action: 'update', status: 'in_review', submitted: 'Yesterday, 14:30', note: 'Net sales should leave out cancelled orders.', view: 'd2c', by: 'Léa', area: 'Rule', tier: 'engineering', stage: 'mr_open', tested: true, mrId: 'MR-13', kind: 'description', events: [ev('Yesterday, 14:30', 'Submitted by Léa'), ev('Yesterday, 16:00', 'Approved by Noa'), ev('Yesterday, 16:05', 'Merge request MR-13 opened')] },
    { id: 'c7', metric: 'sales_one_store', title: 'Verified query “Sales for one store last Saturday”', action: 'update', status: 'in_review', submitted: 'Yesterday, 11:10', note: 'Add the tax-included amount as a second column.', view: 'd2c', by: 'Tom', area: 'Verified query', tier: 'engineering', stage: 'mr_open', tested: true, mrId: 'MR-13', kind: 'description', events: [ev('Yesterday, 11:10', 'Submitted by Tom'), ev('Yesterday, 16:00', 'Approved by Noa'), ev('Yesterday, 16:05', 'Merge request MR-13 opened')] },
    { id: 'c2', metric: 'net_return_rate', title: 'Net digital return rate', action: 'update', status: 'rejected', submitted: 'Yesterday, 16:10', note: 'Count returns per unit shipped.', reason: 'The bottom of the division should be items ordered, not units shipped. Please correct it and resubmit.', view: 'd2c', by: 'Jean', area: 'Metric', tier: 'engineering', stage: 'sent_back', tested: true, kind: 'metric', events: [ev('Yesterday, 16:10', 'Submitted by Jean'), ev('Yesterday, 17:20', 'Sent back by Noa')] },
    { id: 'c3', metric: 'orders_count', title: 'Orders', action: 'create', status: 'live', submitted: '12 Oct 2026', note: 'Track web order volume.', view: 'd2c', by: 'Jean', area: 'Metric', tier: 'engineering', stage: 'live', tested: true, mrId: 'MR-12', kind: 'metric', events: [ev('12 Oct 2026', 'Submitted by Jean'), ev('12 Oct 2026', 'Approved by Noa'), ev('13 Oct 2026', 'Merged by Ravi (MR-12)')] },
    { id: 'c8', metric: 'tables', title: 'Order lines › Shipping method', action: 'update', status: 'live', submitted: '9 Oct 2026', note: 'Added a description.', view: 'd2c', by: 'Tom', area: 'Field description', tier: 'analyst', stage: 'live', tested: false, kind: 'description', events: [ev('9 Oct 2026', 'Submitted by Tom'), ev('9 Oct 2026', 'Approved by Noa, no merge request needed')] },
  ],
  mrs: [
    { id: 'MR-13', title: '2 changes to D2C', view: 'd2c', by: 'Noa', status: 'open', opened: 'Yesterday, 16:05', changeIds: ['c6', 'c7'] },
    { id: 'MR-12', title: '1 change to D2C', view: 'd2c', by: 'Noa', status: 'merged', opened: '12 Oct 2026', closed: '13 Oct 2026', closedBy: 'Ravi', changeIds: ['c3'] },
  ],
})
let state: State = (() => { try { const r = localStorage.getItem('sx-wf'); if (r) return JSON.parse(r) as State } catch { /* use the seed */ } return seed() })()
const save = () => { try { localStorage.setItem('sx-wf', JSON.stringify(state)) } catch { /* kept in memory */ } }
export const resetWorkflow = () => { state = seed(); save() }
const mut = (f: () => void) => { f(); save() }
const byId = (id: string) => state.changes.find((c) => c.id === id)

export const listChanges = async () => { await sleep(250); return [...state.changes] }
export const listMRs = async () => { await sleep(250); return [...state.mrs] }
export const getMR = async (id: string) => { await sleep(200); const mr = state.mrs.find((m) => m.id === id); if (!mr) throw new Error('We could not find that merge request.'); return { mr, changes: mr.changeIds.map(byId).filter(Boolean) as Change[] } }

const AREAS: [RegExp, string, Tier][] = [[/^filter ›/i, 'Filter', 'engineering'], [/^rule ›/i, 'Rule', 'engineering'], [/^verified query ›/i, 'Verified query', 'engineering'], [/^business context|^context ›/i, 'Business context', 'analyst']]
function create(c: Omit<Change, 'id' | 'status' | 'submitted' | 'view' | 'by' | 'stage' | 'events' | 'tested'> & { tested?: boolean; view?: string }): Change {
  const id = `c${++state.seq}`
  const n: Change = { ...c, id, status: 'in_review', submitted: now(), view: c.view ?? 'd2c', by: actor, stage: 'analyst_review', tested: c.tested ?? false, events: [ev(now(), `Submitted by ${actor}`)] }
  mut(() => { state.changes = [n, ...state.changes] })
  return n
}
export async function submitChange(input: { name: string | null; title: string; note: string }) {
  await sleep(500)
  return create({ metric: input.name ?? input.title.toLowerCase().replace(/\W+/g, '_'), title: input.title, action: input.name ? 'update' : 'create', note: input.note, kind: 'metric', area: 'Metric', tier: 'engineering', tested: true })
}
export async function suggestChange(input: { target: string; note: string }) {
  await sleep(500)
  const [, area, tier] = AREAS.find(([re]) => re.test(input.target)) ?? [0, 'Field description', 'analyst' as Tier]
  return create({ metric: input.target, title: input.target.replace(/^context/i, 'Business context'), action: 'update', note: input.note, kind: 'description', area: area as string, tier: tier as Tier })
}

export async function testChange(id: string) {
  await sleep(1200)
  mut(() => { const c = byId(id); if (c) { c.tested = true; c.events.push(ev(now(), `7-day test passed (run by ${actor})`)) } })
}
export async function approveChanges(ids: string[]) {
  await sleep(400)
  mut(() => ids.forEach((id) => { const c = byId(id); if (c && c.tier === 'analyst' && c.stage === 'analyst_review') { c.stage = 'live'; c.status = 'live'; c.events.push(ev(now(), `Approved by ${actor}, no merge request needed`)) } }))
}
export async function sendBack(ids: string[], comment: string) {
  await sleep(400)
  mut(() => ids.forEach((id) => { const c = byId(id); if (c) { c.stage = 'sent_back'; c.status = 'rejected'; c.reason = comment; c.events.push(ev(now(), `Sent back by ${actor}`)) } }))
}
export async function createMR(ids: string[], title: string) {
  await sleep(700)
  const list = ids.map(byId).filter(Boolean) as Change[]
  if (list.length === 0 || list.some((c) => c.tier !== 'engineering' || !c.tested || c.stage !== 'analyst_review')) throw new Error('Every change must be tested and need engineering before it can go in a merge request.')
  const id = `MR-${14 + state.mrs.filter((m) => Number(m.id.slice(3)) > 13).length}`
  mut(() => {
    const nv = list.find((c) => c.area === 'Semantic view')
    state.mrs = [{ id, title, view: list[0].view, by: actor, status: 'open', opened: now(), changeIds: ids, ...(nv ? { kind: 'new_view' as const, viewId: nv.view } : {}) }, ...state.mrs]
    list.forEach((c) => { c.stage = 'mr_open'; c.mrId = id; c.events.push(ev(now(), `Approved by ${actor}`), ev(now(), `Merge request ${id} opened`)) })
  })
  return id
}
/** A business user (or anyone) offers an imported view for review: it lands in the analyst's queue. */
export async function submitViewForReview(viewId: string, name: string, summary: string, note: string) {
  await sleep(500)
  return create({ metric: viewId, title: `New semantic view: ${name}`, action: 'create', note: note || summary, kind: 'description', area: 'Semantic view', tier: 'engineering', tested: true, view: viewId })
}
/** Analyst or engineer opens a merge request that creates the view's folder in the repository. */
export async function publishView(viewId: string, name: string) {
  await sleep(600)
  const existing = state.changes.find((c) => c.area === 'Semantic view' && c.view === viewId && c.stage === 'analyst_review')
  const c = existing ?? create({ metric: viewId, title: `New semantic view: ${name}`, action: 'create', note: `Create views/${viewId}/ in the repository`, kind: 'description', area: 'Semantic view', tier: 'engineering', view: viewId })
  mut(() => { c.tested = true })
  return createMR([c.id], `New view: ${name}`)
}
export type ViewState = { state: 'repo' | 'mr_open' | 'with_analyst' | 'sent_back' | 'draft'; mrId?: string; reason?: string }
export function viewPublishStatus(viewId: string): ViewState {
  if (viewId === 'd2c') return { state: 'repo' }
  const mr = state.mrs.find((m) => m.kind === 'new_view' && m.viewId === viewId)
  if (mr?.status === 'merged') return { state: 'repo', mrId: mr.id }
  if (mr?.status === 'open') return { state: 'mr_open', mrId: mr.id }
  const c = state.changes.find((x) => x.area === 'Semantic view' && x.view === viewId)
  if (c?.stage === 'analyst_review') return { state: 'with_analyst' }
  if (c?.stage === 'sent_back') return { state: 'sent_back', reason: c.reason }
  return { state: 'draft' }
}
export const publishedViews = () => state.mrs.filter((m) => m.kind === 'new_view' && m.status === 'merged').map((m) => ({ viewId: m.viewId as string, mr: m.id }))

export async function rollback(id: string) {
  await sleep(500)
  const c = byId(id); if (!c) throw new Error('Change not found.')
  return create({ metric: c.metric, title: `Roll back: ${c.title}`, action: 'update', note: `Return to the version before “${c.note}”`, kind: c.kind, area: c.area, tier: 'engineering', tested: true })
}
export async function mergeMR(id: string) {
  await sleep(700)
  mut(() => { const m = state.mrs.find((x) => x.id === id); if (!m) return; m.status = 'merged'; m.closed = now(); m.closedBy = actor; m.changeIds.map(byId).forEach((c) => { if (c) { c.stage = 'live'; c.status = 'live'; c.events.push(ev(now(), `Merged by ${actor} (${id})`)) } }) })
}
export async function requestMRChanges(id: string, comment: string) {
  await sleep(500)
  mut(() => { const m = state.mrs.find((x) => x.id === id); if (!m) return; m.status = 'closed'; m.closed = now(); m.closedBy = actor; m.comment = comment; m.changeIds.map(byId).forEach((c) => { if (c) { c.stage = 'sent_back'; c.status = 'rejected'; c.reason = `Engineering: ${comment}`; c.events.push(ev(now(), `Sent back by ${actor} (${id})`)) } }) })
}

export const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
/** A sample code diff for one change. Illustrative only. */
export function diffOf(c: Change): DiffFile {
  const dir = { Metric: 'metrics', Filter: 'filters', Rule: 'rules', 'Verified query': 'verified_queries' }[c.area] ?? 'other'
  const name = slug(c.title.replace(/^(Filter|Rule|Verified query)\s*/i, '').replace(/[“”]/g, '')) || c.metric
  const lines: DiffLine[] = [{ t: 'ctx', s: `name: ${JSON.stringify(c.title.replace(/[“”]/g, ''))}` }]
  if (c.action === 'create') lines.push({ t: 'add', s: `description: ${JSON.stringify(c.note)}`, }, { t: 'add', s: `owner: ${JSON.stringify(c.by)}` })
  else lines.push({ t: 'del', s: 'description: "previous wording"' }, { t: 'add', s: `description: ${JSON.stringify(c.note)}` })
  lines.push({ t: 'ctx', s: `view: ${c.view}` })
  return { path: `views/${c.view}/${dir}/${name}.yaml`, lines }
}

export type Commit = { id: string; msg: string; by: string; when: string; mr?: string }
export const listCommits = async (): Promise<Commit[]> => {
  await sleep(250)
  const merged = state.mrs.filter((m) => m.status === 'merged').map((m, i) => ({ id: (0xa1f3c0 + i * 977 + m.id.length).toString(16).slice(0, 7), msg: `${m.title} (${m.id})`, by: `${m.closedBy ?? 'Ravi'}, from ${m.by}`, when: m.closed ?? '', mr: m.id }))
  return [...merged, { id: '7be90d1', msg: 'Refresh D2C view from the warehouse', by: 'Data Platform', when: '21 Oct 2026' }, { id: '3c4a8e2', msg: 'Add filter D2C retail and e-commerce (MR-9)', by: 'Ravi, from Noa', when: '14 Oct 2026', mr: 'MR-9' }, { id: '91d02fa', msg: 'First version of the D2C view', by: 'Data Platform', when: '2 Jun 2026' }]
}
