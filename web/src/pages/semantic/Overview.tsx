import { useState } from 'react'
import { useRole } from '../../lib/role'
import type { SemanticView } from '../../lib/semantic'
import { coverage } from '../../lib/semantic'
import { Banner } from '../../components/ui'
import { Icon } from '../../components/Icon'
import ModelMap from './ModelMap'
import { ACTIVITY } from '../../lib/activity'
import { listChanges, listMetrics } from '../../lib/mock'
import { getContext } from '../../lib/context'
import { viewToYaml } from '../../lib/yaml'
import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import PublishStrip from '../../components/PublishStrip'
import ImportDialog from '../../components/ImportDialog'
import { clearStored, getStored, useStoreVersion } from '../../lib/store'
import { useQueryClient } from '@tanstack/react-query'

const download = (name: string, text: string) => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'text/yaml' })); a.download = name; a.click(); URL.revokeObjectURL(a.href) }

export default function Overview({ view, go }: { view: SemanticView; go: (p: Record<string, string>) => void }) {
  const all = view.tables.flatMap((t) => t.fields)
  const cov = coverage(all)
  const restricted = all.filter((f) => f.restricted).length
  const { view: viewId = 'd2c' } = useParams()
  const { role } = useRole()
  useStoreVersion()
  const qc = useQueryClient()
  const [importing, setImporting] = useState(false)
  const stored = getStored(viewId)
  const [exporting, setExporting] = useState(false)
  const exportYaml = async () => { setExporting(true); try { const [m, c] = await Promise.all([listMetrics(viewId), getContext(viewId)]); download(`${viewId}_semantic_view.yaml`, viewToYaml(view, m, c)) } finally { setExporting(false) } }
  const pending = (useQuery({ queryKey: ['changes'], queryFn: listChanges }).data ?? []).filter((c) => c.status === 'in_review')
  return (
    <div className="space-y-4">
      {viewId !== 'd2c' && <PublishStrip viewId={viewId} name={view.name} summary={`${view.tables.length} tables, ${view.filters.length} filters, ${view.rules.length} rules and ${view.questions.length} verified queries.`} />}
      <section className="card">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div><h2 className="type-section-title">{view.name}</h2>{stored && viewId !== 'd2c' && <p className="type-muted mt-0.5">Loaded from {stored.source} · {new Date(stored.importedAt).toLocaleDateString('en-GB')}</p>}</div>
          <div className="flex flex-wrap gap-2">
          {viewId !== 'd2c' && <button className="btn btn-outline" onClick={() => setImporting(true)}><Icon name="plus" /> Import YAML</button>}
          {viewId !== 'd2c' && <button className="btn btn-ghost" onClick={() => { if (window.confirm(`Empty the ${view.name} view? Imported content is removed from this browser.`)) { clearStored(viewId); qc.invalidateQueries() } }}>Reset view</button>}
          <button className="btn btn-outline" disabled={exporting} onClick={exportYaml} title="Tables, fields, relationships, metrics, filters, rules, verified queries and context in one file"><Icon name="arrow" className="h-4 w-4 rotate-90" /> {exporting ? 'Preparing…' : 'Download as YAML'}</button>
          </div>
        </div>
        <p className="mt-2 text-base">{view.description}</p>
        <div className="mt-4"><Banner kind="info">Results follow your role and region. A result of 0 can mean "you have no access to that data", not "there is none".</Banner></div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <p className="type-label-caps">You can ask about</p>
            <ul className="mt-2 space-y-1.5">{view.answers.map((a) => <li key={a} className="flex gap-2 text-sm"><Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />{a}</li>)}</ul>
          </div>
          <div>
            <p className="type-label-caps">Not available here</p>
            <ul className="mt-2 space-y-1.5">{view.doesNotAnswer.map((a) => <li key={a} className="flex gap-2 text-sm"><Icon name="x" className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" />{a}</li>)}</ul>
          </div>
        </div>
      </section>

      {view.tables.length > 0 && (
        <section className="card">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="type-section-title">How the data fits together</h2>
            <button className="btn btn-outline" onClick={() => go({ tab: 'tables' })}>Browse all tables</button>
          </div>
          <p className="type-muted mt-1">Click a table to see its fields.</p>
          <div className="mt-3"><ModelMap view={view} onOpen={(id) => go({ tab: 'tables', table: id })} /></div>
        </section>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[['Tables', view.tables.length, 'tables'], ['Ready-made filters', view.filters.length, 'filters'], ['Rules', view.rules.length, 'rules'], ['Verified queries', view.questions.length, 'queries']].map(([l, n, tab]) => (
          <button key={String(l)} onClick={() => go({ tab: String(tab) })} className="card text-left transition-colors hover:border-accent-500/60">
            <p className="text-3xl font-bold tracking-tight">{n}</p><p className="type-muted mt-1">{l}</p>
          </button>
        ))}
      </div>

      <section className="card">
        <h2 className="type-section-title">How well it is documented</h2>
        <div className="mt-3 flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800" role="img" aria-label={`${cov.pct} percent of fields have a description`}>
            <div className="h-full rounded-full bg-accent-500" style={{ width: `${cov.pct}%` }} />
          </div>
          <span className="text-sm font-medium tabular-nums">{cov.pct}%</span>
        </div>
        <p className="type-muted mt-2">{cov.documented} of {cov.total} fields have a description. {restricted} fields are restricted because they identify individual consumers.</p>
        <button className="btn btn-outline mt-3" onClick={() => go({ tab: 'tables', gaps: '1' })}>Show fields with no description</button>
      </section>

      <section className="card">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="type-section-title">Recent activity</h2>
          <Link to="/app/changes" className="btn btn-ghost !py-1 text-xs">Your changes in progress →</Link>
        </div>
        <ul className="mt-3 divide-y divide-neutral-100 dark:divide-neutral-800">
          {pending.map((c) => <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5"><span className="text-sm">{c.title}: {c.note}</span><span className="flex items-center gap-2"><span className="badge badge-warn">In review</span><span className="type-muted">{c.submitted}</span></span></li>)}
          {ACTIVITY.map((a) => <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5"><span className="text-sm">{a.what}<span className="type-muted"> · {a.where}</span></span><span className="type-muted">{a.who} · {a.when}</span></li>)}
        </ul>
      </section>
      <AnimatePresence>{importing && <ImportDialog viewId={viewId} viewName={view.name} replacing onClose={() => setImporting(false)} />}</AnimatePresence>
    </div>
  )
}
