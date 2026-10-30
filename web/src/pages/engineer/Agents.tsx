import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { PARTS, TOOLS, activityOf, addAgent, agentTokens, newKey, removeAgent, restrictedCount, updateAgent, useAgents, viewSizes, type Agent, type Part } from '../../lib/agents'
import { getViews, hasData } from '../../lib/views'
import { listChanges, listMRs, viewPublishStatus, listCommits } from '../../lib/workflow'
import { useStoreVersion } from '../../lib/store'
import { Banner, PageHeader } from '../../components/ui'
import { Icon } from '../../components/Icon'

const STATUS = { connected: ['badge-success', 'Connected'], paused: ['badge-warn', 'Paused'], draft: ['badge-neutral', 'Draft'] } as const
const k = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n))
/** Views an agent may be given: only the ones that are in the repository. */
function useExposable() {
  useStoreVersion(); useQuery({ queryKey: ['changes'], queryFn: listChanges }); useQuery({ queryKey: ['mrs'], queryFn: listMRs })
  return getViews().map((v) => ({ ...v, ok: hasData(v.id) && viewPublishStatus(v.id).state === 'repo', why: !hasData(v.id) ? 'Empty' : 'Not in the repository yet' }))
}

export default function Agents() {
  const agents = useAgents()
  const [tab, setTab] = useState<'endpoint' | 'connections' | 'connect'>('connections')
  const [sel, setSel] = useState<string | undefined>(agents[0]?.id)
  const [reg, setReg] = useState(false)
  const agent = agents.find((a) => a.id === sel) ?? agents[0]
  return (
    <>
      <PageHeader title="MCP" sub="The door AI agents use to read Semantix. Semantix never goes looking for an agent: you give the agent this address and a key, and the agent connects. Each connection decides exactly what that agent can see."
        action={<button className="btn btn-primary" onClick={() => { setTab('connections'); setReg(true) }}><Icon name="plus" /> Create a connection</button>} />
      <div role="tablist" className="mb-4 flex gap-1 border-b border-neutral-200 dark:border-neutral-800">
        {([['endpoint', 'Endpoint and tools'], ['connections', `Connections (${agents.length})`], ['connect', 'Connect an agent']] as const).map(([id, l]) => (
          <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`-mb-px border-b-2 px-3 py-2 text-sm ${tab === id ? 'border-accent-500 font-medium' : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100'}`}>{l}</button>
        ))}
      </div>
      {tab === 'endpoint' && <Endpoint agents={agents} />}
      {tab === 'connect' && <Connect agents={agents} />}
      {tab === 'connections' && (
        <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
          <ul className="space-y-2" aria-label="Connections">
            {agents.map((a) => (
              <li key={a.id}><button onClick={() => setSel(a.id)} aria-current={a.id === agent?.id} className={`w-full rounded-lg border px-3 py-2.5 text-left transition-colors ${a.id === agent?.id ? 'border-accent-500 bg-accent-50 dark:bg-accent-500/10' : 'border-neutral-200 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900'}`}>
                <span className="flex items-center justify-between gap-2"><span className="truncate text-sm font-medium">{a.name}</span><span className={`badge ${STATUS[a.status][0]}`}>{STATUS[a.status][1]}</span></span>
                <span className="type-muted mt-0.5 block truncate">{a.owner} · {Object.keys(a.views).length ? Object.keys(a.views).join(', ').toUpperCase() : 'no view yet'}</span>
                <span className="type-muted block">≈ {k(agentTokens(a))} tokens of context · {a.callsToday} calls today</span>
              </button></li>
            ))}
          </ul>
          {agent ? <Detail key={agent.id} agent={agent} onDeleted={() => setSel(agents.find((x) => x.id !== agent.id)?.id)} /> : <p className="type-muted">No connections yet. Create one to get an address and a key for an agent.</p>}
        </div>
      )}
      <AnimatePresence>{reg && <Register onClose={() => setReg(false)} onDone={(id) => { setSel(id); setReg(false) }} />}</AnimatePresence>
    </>
  )
}

type Sub = 'sees' | 'tools' | 'access' | 'test' | 'activity'
function Detail({ agent: a, onDeleted }: { agent: Agent; onDeleted: () => void }) {
  const [sub, setSub] = useState<Sub>('sees')
  const subs: [Sub, string][] = [['sees', 'What it sees'], ['tools', 'Tools'], ['access', 'Key and limits'], ['test', 'Test'], ['activity', 'Activity']]
  return (
    <section className="card !p-0" aria-label={`${a.name} connection`}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
        <div><h2 className="text-base font-semibold tracking-tight">{a.name}</h2><p className="type-muted">Used by: {a.owner}. Semantix does not need to know where it runs.</p></div>
        <span className="flex items-center gap-2"><span className={`badge ${STATUS[a.status][0]}`}>{STATUS[a.status][1]}</span><button className="btn btn-ghost !py-1 text-xs text-red-600 dark:text-red-400" onClick={() => { if (window.confirm(`Delete the connection ${a.name}? Its key stops working.`)) { removeAgent(a.id); onDeleted() } }}>Delete</button></span>
      </div>
      <div role="tablist" className="flex flex-wrap gap-1 border-b border-neutral-200 px-3 pt-2 dark:border-neutral-800">
        {subs.map(([id, l]) => <button key={id} role="tab" aria-selected={sub === id} onClick={() => setSub(id)} className={`-mb-px border-b-2 px-3 py-2 text-sm ${sub === id ? 'border-accent-500 font-medium' : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100'}`}>{l}</button>)}
      </div>
      <div className="p-4">
        {sub === 'sees' && <Sees a={a} />}
        {sub === 'tools' && <Tools a={a} />}
        {sub === 'access' && <Access a={a} onDeleted={onDeleted} />}
        {sub === 'test' && <Test a={a} />}
        {sub === 'activity' && <Activity a={a} />}
      </div>
    </section>
  )
}

function Sees({ a }: { a: Agent }) {
  const views = useExposable()
  const total = agentTokens(a)
  const level = total < 8000 ? ['bg-emerald-500', 'Light'] : total < 20000 ? ['bg-amber-500', 'Getting heavy'] : ['bg-red-500', 'Heavy: trim it']
  const toggleView = (id: string, on: boolean) => { const v = { ...a.views }; if (on) v[id] = PARTS.map((p) => p.id); else delete v[id]; updateAgent(a.id, { views: v }) }
  const togglePart = (id: string, p: Part) => { const cur = a.views[id] ?? []; updateAgent(a.id, { views: { ...a.views, [id]: cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p] } }) }
  return (
    <div>
      <div className="flex flex-wrap items-center gap-3"><div className="h-2 w-48 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800" role="img" aria-label={`About ${total} tokens of context`}><div className={`h-full rounded-full ${level[0]}`} style={{ width: `${Math.min(100, (total / 30000) * 100)}%` }} /></div>
        <span className="text-sm font-medium">≈ {k(total)} tokens</span><span className="type-muted">{level[1]} · estimate, not an exact count</span></div>
      <ul className="mt-4 space-y-3">
        {views.map((v) => {
          const on = !!a.views[v.id], sizes = viewSizes(v.id)
          return (
            <li key={v.id} className={`rounded-lg border p-3 ${on ? 'border-accent-500/50' : 'border-neutral-200 dark:border-neutral-800'}`}>
              <label className={`flex items-center gap-2 text-sm font-medium ${v.ok ? '' : 'opacity-60'}`}><input type="checkbox" disabled={!v.ok} checked={on} onChange={(e) => toggleView(v.id, e.target.checked)} />{v.name}
                {!v.ok && <span className="badge badge-neutral">{v.why}</span>}</label>
              {on && (
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {PARTS.map((p) => { const s = sizes.find((x) => x.part === p.id); const sel = a.views[v.id].includes(p.id); return (
                    <button key={p.id} aria-pressed={sel} disabled={!s?.items} onClick={() => togglePart(v.id, p.id)} className={`rounded-lg border px-2.5 py-1.5 text-left text-xs transition-colors disabled:opacity-40 ${sel ? 'border-accent-500 bg-accent-50 dark:bg-accent-500/10' : 'border-neutral-200 text-neutral-500 dark:border-neutral-800'}`}>
                      <span className="block font-medium">{p.label}</span><span className="type-muted">{s?.items ?? 0} · ≈ {k(s?.tokens ?? 0)}</span></button>) })}
                </div>
              )}
            </li>
          )
        })}
      </ul>
      <p className="type-muted mt-3 flex items-center gap-1.5"><Icon name="check" className="h-3.5 w-3.5 text-emerald-500" />Restricted fields (those that identify individual consumers) are never sent to any agent. This is fixed.</p>
      <p className="type-muted mt-1">Only views in the repository can be given to an agent. Draft imports cannot.</p>
    </div>
  )
}

function Tools({ a }: { a: Agent }) {
  const served = useMemo(() => new Set(Object.values(a.views).flat()), [a.views])
  return (
    <div>
      <p className="type-muted">Choose which tools this agent may call. A tool with nothing to serve does nothing until you expose the content it needs.</p>
      <ul className="mt-3 divide-y divide-neutral-100 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
        {TOOLS.map((t) => {
          const empty = !t.needs.some((p) => served.has(p))
          return (
            <li key={t.id}><label className="flex items-start gap-3 px-3 py-2.5">
              <input type="checkbox" className="mt-1" checked={a.tools.includes(t.id)} onChange={() => updateAgent(a.id, { tools: a.tools.includes(t.id) ? a.tools.filter((x) => x !== t.id) : [...a.tools, t.id] })} />
              <span className="min-w-0"><span className="type-mono font-medium">{t.id}</span><span className="block text-sm">{t.desc}</span>
                {t.note && <span className="type-muted block">{t.note}</span>}{empty && a.tools.includes(t.id) && <span className="mt-0.5 block text-xs text-amber-600 dark:text-amber-400">Nothing to serve yet: needs {t.needs.map((p) => PARTS.find((x) => x.id === p)?.label.toLowerCase()).join(' or ')}.</span>}</span>
            </label></li>
          )
        })}
      </ul>
    </div>
  )
}

function Access({ a, onDeleted }: { a: Agent; onDeleted: () => void }) {
  const commits = useQuery({ queryKey: ['commits'], queryFn: listCommits }).data ?? []
  const [shown, setShown] = useState<string | null>(null)
  const rotate = () => { const key = newKey(); updateAgent(a.id, { keyHint: key.hint, status: a.status === 'draft' ? 'connected' : a.status }); setShown(key.full) }
  return (
    <div className="space-y-5">
      {shown && <Banner kind="success">Copy this key now. It is shown only once: <span className="type-mono break-all">{shown}</span> <button className="underline" onClick={() => { try { navigator.clipboard.writeText(shown) } catch { /* not copied */ } }}>Copy</button></Banner>}
      <div className="grid gap-4 sm:grid-cols-2">
        <div><p className="label">Key</p><p className="type-mono">{a.keyHint}</p><button className="btn btn-outline mt-2 !py-1 text-xs" onClick={rotate}>{a.keyHint.startsWith('not') ? 'Create a key' : 'Rotate the key'}</button></div>
        <div><label className="label" htmlFor="ag-limit">Calls per day</label><input id="ag-limit" type="number" min={1} className="input max-w-[140px]" value={a.limit} onChange={(e) => updateAgent(a.id, { limit: Math.max(1, Number(e.target.value) || 1) })} /></div>
        <div><label className="label" htmlFor="ag-ver">Version it follows</label>
          <select id="ag-ver" className="input" value={a.version} onChange={(e) => updateAgent(a.id, { version: e.target.value })}>
            <option value="live">Live (follows every merge)</option>{commits.map((c) => <option key={c.id} value={c.id}>Pinned to {c.id}: {c.msg.slice(0, 40)}</option>)}</select>
          <p className="type-muted mt-1">{a.version === 'live' ? 'The agent sees changes as soon as engineering merges them.' : 'The agent keeps seeing this release until you move it.'}</p></div>
        <div><p className="label">Status</p>
          <button className="btn btn-outline !py-1 text-xs" disabled={a.status === 'draft'} onClick={() => updateAgent(a.id, { status: a.status === 'paused' ? 'connected' : 'paused' })}>{a.status === 'paused' ? 'Resume this connection' : 'Pause this connection'}</button>
          {a.status === 'draft' && <p className="type-muted mt-1">Create a key so the agent can connect.</p>}</div>
      </div>
      <div className="border-t border-neutral-100 pt-3 dark:border-neutral-800"><button className="btn btn-ghost text-red-600 dark:text-red-400" onClick={() => { if (window.confirm(`Delete the connection ${a.name}? Its key stops working.`)) { removeAgent(a.id); onDeleted() } }}>Delete this connection</button></div>
    </div>
  )
}

function Test({ a }: { a: Agent }) {
  const tools = TOOLS.filter((t) => a.tools.includes(t.id))
  const served = Object.keys(a.views)
  const steps: [string, boolean, string][] = [
    ['Open a connection with the key', !a.keyHint.startsWith('not'), a.keyHint.startsWith('not') ? 'No key yet. Create one under Key and limits.' : `Key ${a.keyHint} accepted`],
    ['Ask: which tools do you have?', tools.length > 0, tools.length ? `${tools.length} tools: ${tools.map((t) => t.id).join(', ')}` : 'No tool is switched on'],
    ['Ask for a view in its profile', served.length > 0, served.length ? `${served.map((v) => v.toUpperCase()).join(', ')} returned (version ${a.version})` : 'This connection has no view yet'],
    ['Ask for a view outside its profile', true, 'Denied, as it should be'],
  ]
  const [n, setN] = useState(0); const [run, setRun] = useState(false)
  const start = () => { setRun(true); setN(0); steps.forEach((_, i) => setTimeout(() => { setN(i + 1); if (i === steps.length - 1) setRun(false) }, 500 * (i + 1))) }
  return (
    <div>
      <p className="type-muted">Simulates the first conversation between an agent and this connection. Nothing real is called.</p>
      <button className="btn btn-primary mt-3" disabled={run} onClick={start}>{run ? 'Testing…' : n ? 'Test again' : 'Test as this connection'}</button>
      <ol className="mt-4 space-y-2" aria-live="polite">
        {steps.map(([t, ok, d], i) => <li key={t} className="flex items-start gap-2 text-sm">{i < n ? (ok ? <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /> : <Icon name="x" className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />) : <span className="mt-0.5 h-4 w-4 shrink-0 rounded-full border border-neutral-300 dark:border-neutral-700" />}<span><span className={i < n ? 'font-medium' : 'text-neutral-500'}>{t}</span>{i < n && <span className="type-muted block">{d}</span>}</span></li>)}
      </ol>
      <Preview a={a} />
    </div>
  )
}

function Preview({ a }: { a: Agent }) {
  const entries = Object.entries(a.views)
  const tools = TOOLS.filter((t) => a.tools.includes(t.id))
  return (
    <div className="mt-6 border-t border-neutral-100 pt-4 dark:border-neutral-800">
      <h3 className="type-section-title">What the agent receives</h3>
      <p className="type-muted mt-0.5">Nothing else leaves Semantix.</p>
      <h3 className="type-label-caps mt-4">Tools it can call ({tools.length})</h3>
      <p className="type-mono mt-1.5 flex flex-wrap gap-1.5">{tools.map((t) => <span key={t.id} className="badge badge-neutral">{t.id}</span>)}{tools.length === 0 && <span className="type-muted">none</span>}</p>
      {entries.length === 0 && <div className="mt-4"><Banner kind="warn">This connection has no view yet, so the agent would receive nothing.</Banner></div>}
      {entries.map(([v, parts]) => {
        const sizes = viewSizes(v).filter((s) => parts.includes(s.part) && s.items > 0)
        return (
          <div key={v} className="mt-4 rounded-lg border border-neutral-200 dark:border-neutral-800">
            <p className="flex items-center justify-between border-b border-neutral-200 bg-neutral-50 px-3 py-1.5 text-sm font-medium dark:border-neutral-800 dark:bg-neutral-900">View {v.toUpperCase()}<span className="type-muted">version: {a.version === 'live' ? 'live' : a.version}</span></p>
            <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {sizes.map((s) => <li key={s.part} className="flex flex-wrap items-baseline gap-x-3 px-3 py-2 text-sm"><span className="w-36 shrink-0 font-medium">{PARTS.find((p) => p.id === s.part)?.label}</span><span className="type-muted min-w-0 flex-1 truncate">{s.items} item{s.items > 1 ? 's' : ''}: {s.sample.slice(0, 3).join(', ')}{s.sample.length > 3 ? '…' : ''}</span><span className="type-muted">≈ {k(s.tokens)}</span></li>)}
              {PARTS.filter((p) => !parts.includes(p.id)).length > 0 && <li className="px-3 py-2 text-xs text-neutral-500">Not sent: {PARTS.filter((p) => !parts.includes(p.id)).map((p) => p.label.toLowerCase()).join(', ')}</li>}
              {restrictedCount(v) > 0 && <li className="px-3 py-2 text-xs text-neutral-500">Never sent: {restrictedCount(v)} restricted fields</li>}
            </ul>
          </div>
        )
      })}
      <p className="type-muted mt-3">Prototype: a summary of the content, not the real tool output.</p>
    </div>
  )
}

function Activity({ a }: { a: Agent }) {
  const calls = activityOf(a)
  const per = calls.reduce<Record<string, number>>((m, c) => ({ ...m, [c.tool]: (m[c.tool] ?? 0) + 1 }), {})
  if (!calls.length) return <p className="type-muted">No calls yet. Create a key and connect the agent to see activity.</p>
  return (
    <div>
      <p className="type-muted">{a.callsToday} calls today of {a.limit} allowed · last call {a.lastCall} (sample data)</p>
      <ul className="mt-3 flex flex-wrap gap-2">{Object.entries(per).map(([t, n]) => <li key={t} className="badge badge-neutral">{t} · {n}</li>)}</ul>
      <div className="mt-3 overflow-x-auto"><table className="w-full text-sm"><thead><tr className="type-table-header text-left"><th className="py-2 pr-4">When</th><th className="pr-4">Tool</th><th className="pr-4">View</th><th className="pr-4">Time</th><th>Result</th></tr></thead>
        <tbody>{calls.map((c, i) => <tr key={i} className="border-t border-neutral-100 dark:border-neutral-800"><td className="py-2 pr-4 text-neutral-500">{c.when}</td><td className="type-mono pr-4">{c.tool}</td><td className="pr-4">{c.view.toUpperCase()}</td><td className="pr-4 tabular-nums">{c.ms} ms</td><td>{c.ok ? <span className="badge badge-success">OK</span> : <span className="badge badge-error" title={c.note}>Denied</span>}{c.note && <span className="type-muted ml-2">{c.note}</span>}</td></tr>)}</tbody></table></div>
    </div>
  )
}

const ADDRESS = 'https://<your-semantix-portal>/mcp'
function Copy({ text }: { text: string }) {
  const [d, setD] = useState(false)
  return <button className="btn btn-ghost !px-2 !py-0.5 text-xs" onClick={() => { try { navigator.clipboard.writeText(text).then(() => { setD(true); setTimeout(() => setD(false), 1500) }) } catch { /* not copied */ } }}>{d ? 'Copied' : 'Copy'}</button>
}

function Endpoint({ agents }: { agents: Agent[] }) {
  const HEALTH = ['The server answers', 'The tool list loads', 'The repository content is readable']
  const [n, setN] = useState(0); const [run, setRun] = useState(false)
  const check = () => { setRun(true); setN(0); HEALTH.forEach((_, i) => setTimeout(() => { setN(i + 1); if (i === HEALTH.length - 1) setRun(false) }, 450 * (i + 1))) }
  return (
    <div className="space-y-4">
      <section className="card">
        <p className="type-muted">The address agents connect to</p>
        <div className="mt-1 flex flex-wrap items-center gap-2"><span className="type-mono break-all text-sm">{ADDRESS}</span><Copy text={ADDRESS} /></div>
        <p className="type-muted mt-2">One address for every agent. The key an agent presents decides what it gets. The agent must be able to reach this address from where it runs (same company network or cloud). Semantix never opens a connection to an agent.</p>
        <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-neutral-100 pt-3 dark:border-neutral-800"><span className="flex items-center gap-2 text-sm font-medium"><span className="h-2 w-2 rounded-full bg-emerald-500" />Running (sample)</span>
          <span className="type-muted">{agents.filter((x) => x.status === 'connected').length} connected · {agents.length} connections</span>
          <button className="btn btn-outline ml-auto !py-1 text-xs" disabled={run} onClick={check}>{run ? 'Checking…' : 'Check health'}</button></div>
        {n > 0 && <ul className="mt-3 space-y-1" aria-live="polite">{HEALTH.map((h, i) => <li key={h} className="flex items-center gap-2 text-sm">{i < n ? <Icon name="check" className="h-4 w-4 text-emerald-500" /> : <span className="h-4 w-4 rounded-full border border-neutral-300 dark:border-neutral-700" />}<span className={i < n ? '' : 'text-neutral-500'}>{h}</span></li>)}</ul>}
      </section>
      <Banner kind="info">Semantix supplies definitions and SQL. It does not run queries: each agent runs the SQL itself under its own read-only warehouse role. Prototype note: today's backend has simplified endpoints (<span className="type-mono">/mcp/tools</span>, <span className="type-mono">/mcp/tools/call</span>). Whether your agents need the standard MCP protocol is not verified.</Banner>
      <section className="card !p-0"><h2 className="type-section-title px-4 pt-4">Tools the server offers</h2>
        <ul className="mt-2 divide-y divide-neutral-100 dark:divide-neutral-800">{TOOLS.map((t) => <li key={t.id} className="flex flex-wrap items-baseline gap-x-4 px-4 py-3"><span className="type-mono w-48 shrink-0 font-medium">{t.id}</span><span className="min-w-0 flex-1 text-sm">{t.desc}{t.note && <span className="type-muted block">{t.note}</span>}</span><span className="type-muted">{agents.filter((x) => x.tools.includes(t.id)).length} of {agents.length} connections</span></li>)}</ul></section>
    </div>
  )
}

const MAP: [string, string][] = [
  ['pull(): fetch the semantic view from Snowflake into a YAML file', 'Removed. Semantix is the source now.'],
  ['load(): read the business context and rules from the file', 'Tools get_business_context and search_context'],
  ['The verified queries from the file', 'Tool get_verified_queries'],
  ['The metric definitions in the file', 'Tools list_metrics, get_metric and compile_sql'],
  ['validate(): the SQL safety gate', 'Stays in the agent'],
  ['run_sql(): run the SQL on Snowflake with SnowSQL', 'Stays in the agent, under its own read-only role'],
]
function Connect({ agents }: { agents: Agent[] }) {
  const [id, setId] = useState(agents[0]?.id)
  const a = agents.find((x) => x.id === id) ?? agents[0]
  const [path, setPath] = useState<'host' | 'custom'>('custom')
  const ready: [string, boolean][] = a ? [['A key is created', !a.keyHint.startsWith('not')], ['At least one view is given', Object.keys(a.views).length > 0], ['At least one tool is switched on', a.tools.length > 0], ['The connection is not paused', a.status !== 'paused']] : []
  const code = '# Sample, not verified: call a Semantix tool with the connection\'s key\nimport os, requests\n\nr = requests.post(\n    os.environ["SEMANTIX_MCP_URL"] + "/tools/call",\n    headers={"Authorization": f"Bearer {os.environ[\'SEMANTIX_MCP_KEY\']}"},\n    json={"name": "get_business_context", "arguments": {"view": "d2c"}},\n)\nprint(r.json())'
  const json = `{\n  "mcpServers": {\n    "semantix": {\n      "url": "${ADDRESS}",\n      "headers": { "Authorization": "Bearer <key of the connection>" }\n    }\n  }\n}`
  return (
    <div className="space-y-4">
      <section className="card">
        <h2 className="type-section-title">How the link works</h2>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm" aria-label="Agent calls Semantix">
          <span className="rounded-lg border border-neutral-200 px-3 py-2 dark:border-neutral-800">Your agent<span className="type-muted block">runs anywhere on your network</span></span>
          <span aria-hidden className="text-neutral-400">→ address + key →</span>
          <span className="rounded-lg border border-accent-500/50 bg-accent-50 px-3 py-2 dark:bg-accent-500/10">Semantix MCP<span className="type-muted block">answers only what the key allows</span></span>
          <span aria-hidden className="text-neutral-400">→</span>
          <span className="rounded-lg border border-neutral-200 px-3 py-2 dark:border-neutral-800">Definitions and SQL<span className="type-muted block">the agent runs the SQL itself</span></span>
        </div>
      </section>

      <section className="card">
        <h2 className="type-section-title">1. Pick the connection you are setting up</h2>
        <select className="input mt-2 max-w-sm" aria-label="Connection" value={a?.id} onChange={(e) => setId(e.target.value)}>{agents.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
        {a && <>
          <ul className="mt-3 space-y-1.5">{ready.map(([t, ok]) => <li key={t} className="flex items-center gap-2 text-sm">{ok ? <Icon name="check" className="h-4 w-4 text-emerald-500" /> : <Icon name="x" className="h-4 w-4 text-red-500" />}<span className={ok ? '' : 'text-neutral-500'}>{t}</span></li>)}</ul>
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2"><div><dt className="type-muted">Address</dt><dd className="type-mono flex items-center gap-1 break-all">{ADDRESS}<Copy text={ADDRESS} /></dd></div><div><dt className="type-muted">Key</dt><dd className="type-mono">{a.keyHint}</dd></div></dl>
          <p className="type-muted mt-2">Give these two values to the team that runs the agent. Create or rotate the key under Connections, Key and limits.</p>
        </>}
      </section>

      <section className="card">
        <h2 className="type-section-title">2. Connect the agent</h2>
        <div role="tablist" className="mt-2 flex gap-1.5">{([['custom', 'A custom agent (like the D2C agent)'], ['host', 'An assistant with MCP settings']] as const).map(([p, l]) => <button key={p} role="tab" aria-selected={path === p} onClick={() => setPath(p)} className={`rounded-full border px-3 py-1 text-xs font-medium ${path === p ? 'border-accent-500 bg-accent-50 text-accent-700 dark:bg-accent-500/10 dark:text-accent-300' : 'border-neutral-200 text-neutral-600 dark:border-neutral-800 dark:text-neutral-400'}`}>{l}</button>)}</div>
        {path === 'host' ? (
          <div className="mt-3 text-sm"><p>Products with built-in MCP support only need the address and key in their MCP settings. They then list the tools by themselves. This is the typical shape of that setting (unverified for your products):</p>
            <pre className="type-mono mt-2 overflow-x-auto rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">{json}</pre></div>
        ) : (
          <div className="mt-3 space-y-3 text-sm">
            <ol className="list-decimal space-y-1.5 pl-5"><li>Put the address and the key in the agent's settings, for example as <span className="type-mono">SEMANTIX_MCP_URL</span> and <span className="type-mono">SEMANTIX_MCP_KEY</span>. Keep the key in a secret store.</li><li>Replace the part that reads the semantic view file with calls to the tools below.</li><li>Keep the SQL safety gate and the Snowflake execution in the agent.</li><li>Test it on the Connections tab.</li></ol>
            <div className="overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800"><table className="w-full text-left text-sm"><thead><tr className="type-table-header border-b border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900"><th className="px-3 py-2">Today in the D2C agent</th><th className="px-3 py-2">With Semantix</th></tr></thead>
              <tbody>{MAP.map(([x, y]) => <tr key={x} className="border-t border-neutral-100 dark:border-neutral-800"><td className="px-3 py-2">{x}</td><td className="px-3 py-2">{y}</td></tr>)}</tbody></table></div>
            <div className="overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800"><div className="flex items-center justify-between border-b border-neutral-200 bg-neutral-50 px-3 py-1.5 dark:border-neutral-800 dark:bg-neutral-900"><span className="type-muted">Python (sample)</span><Copy text={code} /></div><pre className="type-mono overflow-x-auto p-3">{code}</pre></div>
            <p className="type-muted">The D2C agent is a custom Python app with its own tool loop, so this needs a small code change. I have not checked which MCP client library would be simplest for it.</p>
          </div>
        )}
      </section>
    </div>
  )
}

function Register({ onClose, onDone }: { onClose: () => void; onDone: (id: string) => void }) {
  const views = useExposable()
  const [name, setName] = useState(''); const [owner, setOwner] = useState(''); const [vs, setVs] = useState<string[]>([])
  useEffect(() => { const x = (e: KeyboardEvent) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', x); return () => window.removeEventListener('keydown', x) }, [onClose])
  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-30 bg-black/30" onClick={onClose} />
      <motion.aside role="dialog" aria-label="Create a connection" initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 40, opacity: 0 }} transition={{ duration: 0.18 }}
        className="fixed inset-y-0 right-0 z-40 w-full max-w-md overflow-y-auto border-l border-neutral-200 bg-white p-6 shadow-xl dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-start justify-between"><h2 className="text-lg font-semibold tracking-tight">Create a connection</h2><button className="btn btn-ghost !px-1.5" onClick={onClose} aria-label="Close"><Icon name="x" /></button></div>
        <label className="label mt-4" htmlFor="rn">Connection name *</label><input id="rn" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="For example: Retail agent" />
        <label className="label mt-3" htmlFor="ro">Who will use it (team) *</label><input id="ro" className="input" value={owner} onChange={(e) => setOwner(e.target.value)} />
        <fieldset className="mt-3"><legend className="label">Views it may see</legend>
          {views.map((v) => <label key={v.id} className={`flex items-center gap-2 py-0.5 text-sm ${v.ok ? '' : 'opacity-50'}`}><input type="checkbox" disabled={!v.ok} checked={vs.includes(v.id)} onChange={() => setVs(vs.includes(v.id) ? vs.filter((x) => x !== v.id) : [...vs, v.id])} />{v.name}{!v.ok && <span className="type-muted">· {v.why}</span>}</label>)}
        </fieldset>
        <p className="type-muted mt-3">You choose the content and the tools next, then create the key. The name is only a label: Semantix does not need to know where the agent runs.</p>
        <div className="mt-4 flex gap-2"><button className="btn btn-primary" disabled={name.trim().length < 2 || owner.trim().length < 2} onClick={() => onDone(addAgent({ name: name.trim(), owner: owner.trim(), views: Object.fromEntries(vs.map((v) => [v, PARTS.map((p) => p.id)])) }))}>Create</button><button className="btn btn-ghost" onClick={onClose}>Cancel</button></div>
      </motion.aside>
    </>
  )
}
