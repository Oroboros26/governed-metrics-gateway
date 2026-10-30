import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { listMRs, listCommits } from '../../lib/workflow'
import { listPeople } from '../../lib/people'
import { getViews, hasData } from '../../lib/views'
import { getStored, useStoreVersion } from '../../lib/store'
import { SEMANTIC, coverage } from '../../lib/semantic'
import { readWarehouse } from '../Warehouse'
import { useAgents } from '../../lib/agents'
import { PageHeader } from '../../components/ui'

export default function EngOverview() {
  useStoreVersion()
  const mrs = useQuery({ queryKey: ['mrs'], queryFn: listMRs }).data ?? []
  const people = useQuery({ queryKey: ['people'], queryFn: listPeople }).data ?? []
  const commits = useQuery({ queryKey: ['commits'], queryFn: listCommits }).data ?? []
  const open = mrs.filter((m) => m.status === 'open')
  const wh = readWarehouse('engineer')
  const agents = useAgents()
  const stats: [string, number | string, string][] = [
    ['Open merge requests', open.length, '/app/mrs'], ['Semantic views', getViews().length, '/app/views'],
    ['Data analysts', people.filter((p) => p.role === 'analyst').length, '/app/people'], ['Business users', people.filter((p) => p.role === 'business').length, '/app/people'],
    ['MCP', agents.filter((a) => a.status === 'connected').length + ' connected', '/app/mcp'], ['Warehouse', wh.connected ? 'Connected' : 'Not connected', '/app/warehouse'],
  ]
  return (
    <>
      <PageHeader title="Overview" sub="Everything in Semantix at a glance." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        {stats.map(([l, n, to]) => <Link key={l} to={to} className="card transition-colors hover:border-accent-500/60"><p className="text-2xl font-bold tracking-tight">{n}</p><p className="type-muted mt-1">{l}</p></Link>)}
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="card">
          <h2 className="type-section-title">Waiting for your review</h2>
          {open.length === 0 ? <p className="type-muted mt-2">Nothing waiting.</p> : <ul className="mt-2 divide-y divide-neutral-100 dark:divide-neutral-800">{open.map((m) => <li key={m.id}><Link to={`/app/mrs/${m.id}`} className="flex items-center justify-between gap-2 py-2.5 hover:underline"><span className="text-sm"><span className="type-mono mr-2">{m.id}</span>{m.title}</span><span className="type-muted">{m.by} · {m.opened}</span></Link></li>)}</ul>}
        </section>
        <section className="card">
          <h2 className="type-section-title">Recent commits</h2>
          <ul className="mt-2 divide-y divide-neutral-100 dark:divide-neutral-800">{commits.slice(0, 4).map((c) => <li key={c.id} className="flex items-center justify-between gap-2 py-2.5"><span className="text-sm">{c.msg}</span><span className="type-muted">{c.when}</span></li>)}</ul>
        </section>
        <section className="card lg:col-span-2">
          <h2 className="type-section-title">Semantic views</h2>
          <div className="mt-2 overflow-x-auto"><table className="w-full text-sm">
            <thead><tr className="type-table-header text-left"><th className="py-2 pr-4">View</th><th className="pr-4">Status</th><th className="pr-4">Tables</th><th className="pr-4">Described</th><th className="pr-4">Analyst</th><th>Owner team</th></tr></thead>
            <tbody>
              {getViews().map((v) => {
                const d = v.id === 'd2c' ? SEMANTIC : getStored(v.id)?.semantic
                const cov = d ? coverage(d.tables.flatMap((t) => t.fields)).pct : null
                return <tr key={v.id} className="border-t border-neutral-100 dark:border-neutral-800"><td className="py-2.5 pr-4"><Link className="font-medium hover:underline" to={`/app/v/${v.id}/overview`}>{v.name}</Link></td><td className="pr-4">{hasData(v.id) ? <span className="badge badge-success">Live</span> : <span className="badge badge-neutral">Empty</span>}</td><td className="pr-4 tabular-nums">{d?.tables.length ?? '—'}</td><td className="pr-4 tabular-nums">{cov == null ? '—' : `${cov}%`}</td><td className="pr-4">{people.filter((p) => p.role === 'analyst' && p.views.includes(v.id)).map((p) => p.name).join(', ') || '—'}</td><td>{v.owner}</td></tr>
              })}
            </tbody></table></div>
        </section>
      </div>
    </>
  )
}
