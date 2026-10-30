import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getMetric, englishOf, formulaOf, listMetrics } from '../lib/mock'
import { Banner, ErrorState, PageHeader, Skeleton } from '../components/ui'
import { Icon } from '../components/Icon'
import { path } from '../lib/views'
import { useRole } from '../lib/role'
import { getSemanticView } from '../lib/semantic'
import { mentionedIn } from '../lib/mentions'

export default function MetricDetail() {
  const { name = '', view = 'd2c' } = useParams()
  const go = useNavigate()
  const { canEdit } = useRole()
  const [showFormula, setShowFormula] = useState(false)
  const [restore, setRestore] = useState<number | null>(null)
  const [done, setDone] = useState<number | null>(null)
  const { data: m, isLoading, isError, error, refetch } = useQuery({ queryKey: ['metric', view, name], queryFn: () => getMetric(name, view) })
  const all = useQuery({ queryKey: ['metrics', view], queryFn: () => listMetrics(view) }).data
  const sem = useQuery({ queryKey: ['semantic', view], queryFn: () => getSemanticView(view) }).data
  const title = (n: string) => all?.find((x) => x.name === n)?.title ?? n.replaceAll('_', ' ')

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-10 w-72" /><Skeleton className="h-40" /><Skeleton className="h-40" /></div>
  if (isError || !m) return <ErrorState message={(error as Error)?.message ?? 'Metric not found.'} onRetry={() => refetch()} />

  const Chips = ({ names }: { names: string[] }) => names.length
    ? <div className="flex flex-wrap gap-2">{names.map((n) => <Link key={n} to={path.metric(view, n)} className="badge badge-neutral !px-2.5 !py-1 hover:bg-accent-50 hover:text-accent-700 dark:hover:bg-accent-500/10 dark:hover:text-accent-300">{title(n)}</Link>)}</div>
    : <p className="type-muted">None</p>

  return (
    <>
      <Link to={path.section(view, 'metrics')} className="btn btn-ghost mb-3 !px-2"><Icon name="left" /> Metrics</Link>
      <PageHeader title={m.title} sub={m.description}
        action={<div className="flex items-center gap-2">{m.imported ? <span className="badge badge-neutral">Imported</span> : <span className="badge badge-success">Live</span>}
          {!m.imported && canEdit && <Link to={path.edit(view, m.name)} className="btn btn-primary">Edit metric</Link>}</div>} />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <section className="card">
            <h2 className="type-section-title">How it is calculated</h2>
            {m.imported ? <pre className="type-mono mt-2 overflow-x-auto whitespace-pre-wrap rounded-lg bg-neutral-100 p-3 dark:bg-neutral-950">{m.expression ?? 'No expression in the file'}</pre> : <>
            <p className="mt-2 text-base">{englishOf(m.def)}.</p>
            <button className="btn btn-ghost mt-3 !px-2" aria-expanded={showFormula} onClick={() => setShowFormula((s) => !s)}>
              {showFormula ? 'Hide formula' : 'Show formula'}
            </button>
            {showFormula && <pre className="type-mono mt-2 overflow-x-auto rounded-lg bg-neutral-100 p-3 dark:bg-neutral-950">{formulaOf(m.def)}</pre>}</>}
          </section>

          {!m.imported && <section className="card">
            <h2 className="type-section-title">Version history</h2>
            {done && <div className="mt-3"><Banner kind="success">Request to restore version {done} created. It goes through the automatic test and review like any other change.</Banner></div>}
            <ul className="mt-3 divide-y divide-neutral-100 dark:divide-neutral-800">
              {m.history.map((h, i) => (
                <li key={h.v} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <div>
                    <p className="text-sm font-medium">Version {h.v} {i === 0 && <span className="badge badge-accent ml-1">Current</span>}</p>
                    <p className="type-muted">{h.note} · {h.by} · {h.date}</p>
                  </div>
                  {i > 0 && (restore === h.v
                    ? <span className="flex items-center gap-2"><button className="btn btn-primary" onClick={() => { setDone(h.v); setRestore(null) }}>Create restore request</button>
                        <button className="btn btn-ghost" onClick={() => setRestore(null)}>Cancel</button></span>
                    : <button className="btn btn-outline" onClick={() => setRestore(h.v)}>Roll back</button>)}
                </li>
              ))}
            </ul>
          </section>}
        </div>

        <aside className="space-y-4">
          <section className="card">
            <h2 className="type-section-title">Source</h2>
            <p className="type-mono mt-2">{m.table}</p>
            <p className="type-muted mt-1">Last updated {m.updated}</p>
          </section>
          <section className="card">
            <h2 className="type-section-title">Builds on</h2>
            <div className="mt-2"><Chips names={m.buildsOn} /></div>
          </section>
          <section className="card">
            <h2 className="type-section-title">Feeds</h2>
            <div className="mt-2"><Chips names={m.feeds} /></div>
            {m.feeds.length > 0 && <div className="mt-3"><Banner kind="warn">Changing this metric also changes {m.feeds.length} other metric{m.feeds.length > 1 ? 's' : ''}.</Banner></div>}
          </section>
          {sem && (() => { const u = mentionedIn(m, sem); return (
            <section className="card">
              <h2 className="type-section-title">Mentioned in</h2>
              <p className="type-muted mt-0.5">Verified queries and rules that talk about this metric. Check them before changing it.</p>
              {u.queries.length + u.rules.length === 0 ? <p className="type-muted mt-2">Nothing else mentions it.</p> : (
                <ul className="mt-2 space-y-1.5 text-sm">
                  {u.queries.map((x) => <li key={x.id}><Link className="hover:underline" to={path.section(view, 'queries')}><span className="badge badge-neutral mr-1.5">Query</span>{x.text}</Link></li>)}
                  {u.rules.map((r) => <li key={r.id}><Link className="hover:underline" to={path.section(view, 'rules')}><span className="badge badge-neutral mr-1.5">Rule</span>{r.title}</Link></li>)}
                </ul>
              )}
            </section>
          ) })()}
          <button className="btn btn-outline w-full" onClick={() => go('/app/changes')}>See my changes</button>
        </aside>
      </div>
    </>
  )
}
