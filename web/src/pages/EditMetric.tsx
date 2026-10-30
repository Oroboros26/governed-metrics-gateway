import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ACTIONS, COLUMNS, TABLES, englishOf, fmt, formulaOf, getMetric, runTest, sameDef, submitChange, validate, type Def, type TestResult } from '../lib/mock'
import { Banner, ErrorState, PageHeader, Skeleton } from '../components/ui'
import { Icon } from '../components/Icon'
import { path } from '../lib/views'

const BLANK: Def = { action: 'sum', column: 'item_price', per: null }

export default function EditMetric() {
  const { name, view = 'd2c' } = useParams()
  const isNew = !name
  const go = useNavigate()
  const qc = useQueryClient()
  const { data: m, isLoading, isError, error, refetch } = useQuery({ queryKey: ['metric', name], queryFn: () => getMetric(name!), enabled: !isNew })

  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [def, setDef] = useState<Def>(BLANK)
  const [advanced, setAdvanced] = useState(false)
  const [note, setNote] = useState('')
  const [result, setResult] = useState<TestResult | null>(null)
  useEffect(() => { if (m) { setTitle(m.title); setDesc(m.description); setDef(m.def) } }, [m])

  const test = useMutation({ mutationFn: () => runTest({ name: name ?? null, draft: def }), onSuccess: setResult })
  const submit = useMutation({
    mutationFn: () => submitChange({ name: name ?? null, title, note }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['changes'] }) },
  })

  const edit = (patch: Partial<Def>) => { setDef((d) => ({ ...d, ...patch })); setResult(null); test.reset() }
  const error_ = validate(def)
  const unchanged = !!m && sameDef(m.def, def) && title === m.title && desc === m.description
  const ready = title.trim().length > 2 && !error_ && !(m && unchanged)
  const locked = submit.isSuccess

  if (!isNew && isLoading) return <div className="space-y-4"><Skeleton className="h-10 w-72" /><Skeleton className="h-64" /></div>
  if (!isNew && (isError || !m)) return <ErrorState message={(error as Error)?.message ?? 'Metric not found.'} onRetry={() => refetch()} />

  const max = result ? Math.max(...result.days.flatMap((d) => [d.production ?? 0, d.draft])) : 1
  const v = result?.variance ?? null

  return (
    <>
      <Link to={isNew ? path.section(view, 'metrics') : path.metric(view, name!)} className="btn btn-ghost mb-3 !px-2"><Icon name="left" /> {isNew ? 'Metrics' : m!.title}</Link>
      <PageHeader title={isNew ? 'Add a metric' : `Edit ${m!.title}`}
        sub="Choose from the lists below. We show what it means in plain English, then test it before it goes to review." />

      <div className="grid gap-4 lg:grid-cols-5">
        <section className="card space-y-4 lg:col-span-3">
          <h2 className="type-section-title">1. Define</h2>
          <div>
            <label className="label" htmlFor="title">Metric name</label>
            <input id="title" className="input" value={title} disabled={locked} onChange={(e) => { setTitle(e.target.value); setResult(null) }} placeholder="For example: Refund rate" />
          </div>
          <div>
            <label className="label" htmlFor="desc">What does it mean for the business?</label>
            <textarea id="desc" rows={2} className="input" value={desc} disabled={locked} onChange={(e) => setDesc(e.target.value)} placeholder="One sentence a colleague would understand" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="tbl">Where the data comes from</label>
              <select id="tbl" className="input" disabled={locked}>{TABLES.map((t) => <option key={t}>{t}</option>)}</select>
            </div>
            <div>
              <label className="label" htmlFor="act">What to do</label>
              <select id="act" className="input" value={def.action} disabled={locked} onChange={(e) => edit({ action: e.target.value as Def['action'] })}>
                {ACTIONS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="col">Measure</label>
              <select id="col" className="input" value={def.column} disabled={locked} onChange={(e) => edit({ column: e.target.value })}>
                {COLUMNS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="per">Divided by (optional)</label>
              <select id="per" className="input" value={def.per ?? ''} disabled={locked} onChange={(e) => edit({ per: e.target.value || null })}>
                <option value="">Nothing, show the value as is</option>
                {COLUMNS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
            </div>
          </div>
          {error_ && <Banner kind="error">{error_}</Banner>}
        </section>

        <aside className="space-y-4 lg:col-span-2">
          <section className="card">
            <h2 className="type-section-title">What this means</h2>
            <p className="mt-2 text-base">{error_ ? 'Fix the choices on the left to see the meaning.' : `${englishOf(def)}.`}</p>
            <button className="btn btn-ghost mt-3 !px-2" aria-expanded={advanced} onClick={() => setAdvanced((a) => !a)}>{advanced ? 'Hide advanced' : 'Advanced: show formula'}</button>
            {advanced && !error_ && <pre className="type-mono mt-2 overflow-x-auto rounded-lg bg-neutral-100 p-3 dark:bg-neutral-950">{formulaOf(def)}</pre>}
          </section>
          {m && m.feeds.length > 0 && <Banner kind="warn">This metric feeds {m.feeds.length} other metric{m.feeds.length > 1 ? 's' : ''}. If this change is approved they will change too.</Banner>}
          <button className="btn btn-primary w-full !py-2.5" disabled={!ready || test.isPending || locked} onClick={() => test.mutate()}>
            {test.isPending ? 'Testing…' : '2. Confirm and test'}
          </button>
          {!ready && !error_ && <p className="type-muted">{m && unchanged ? 'Change something to run a test.' : 'Give the metric a name to continue.'}</p>}
        </aside>
      </div>

      {test.isPending && (
        <div className="card mt-4" role="status">
          <p className="type-section-title">Running the automatic test</p>
          <p className="type-muted mt-1">Checking the formula, then running it over the last 7 days of sample data…</p>
          <Skeleton className="mt-4 h-40" />
        </div>
      )}

      {result && (
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card mt-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="type-section-title">3. Test result (sample data)</h2>
              <p className="mt-2 text-2xl font-bold tracking-tight">
                {v == null ? 'New metric: nothing to compare yet' : `${v > 0 ? '+' : ''}${v.toFixed(1)}% ${v > 0 ? 'higher' : v < 0 ? 'lower' : 'same'} than today's version`}
              </p>
              <p className={`type-muted mt-1 ${v == null || v === 0 ? '' : v > 0 ? '!text-emerald-600' : '!text-red-600'}`}>{v === 0 ? 'Your draft gives the same answer as production.' : 'Variance over the last 7 days.'}</p>
            </div>
            <span className="badge badge-success"><Icon name="check" className="h-3 w-3" /> Automatic test passed</span>
          </div>

          <div className="mt-5 grid gap-6 lg:grid-cols-2">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-neutral-200 dark:border-neutral-800">
                  {['Day', 'Production', 'Your draft'].map((h, i) => <th key={h} className={`type-table-header py-2 ${i ? 'text-right' : 'text-left'}`}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {result.days.map((r) => (
                    <tr key={r.label} className="border-b border-neutral-100 dark:border-neutral-800/60">
                      <td className="py-2">{r.label}</td><td className="py-2 text-right tabular-nums">{fmt(r.production)}</td><td className="py-2 text-right tabular-nums">{fmt(r.draft)}</td>
                    </tr>
                  ))}
                  <tr className="font-semibold"><td className="py-2">{result.total.label}</td><td className="py-2 text-right tabular-nums">{fmt(result.total.production)}</td><td className="py-2 text-right tabular-nums">{fmt(result.total.draft)}</td></tr>
                </tbody>
              </table>
            </div>
            <div>
              <svg viewBox="0 0 280 150" className="w-full" role="img" aria-label="Bar chart of production against your draft for each of the last 7 days">
                {result.days.map((d, i) => {
                  const x = 8 + i * 38, h1 = ((d.production ?? 0) / max) * 120, h2 = (d.draft / max) * 120
                  return (
                    <g key={d.label}>
                      <rect x={x} y={130 - h1} width={14} height={h1} rx={2} className="fill-neutral-300 dark:fill-neutral-600" />
                      <rect x={x + 16} y={130 - h2} width={14} height={h2} rx={2} className="fill-accent-500" />
                      <text x={x + 15} y={145} textAnchor="middle" className="fill-neutral-500 text-[8px]">{d.label.split(' ')[0]}</text>
                    </g>
                  )
                })}
              </svg>
              <p className="type-muted mt-1 flex items-center gap-4">
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-neutral-400" />Production</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-accent-500" />Your draft</span>
              </p>
            </div>
          </div>

          {!submit.isSuccess ? (
            <div className="mt-6 border-t border-neutral-100 pt-5 dark:border-neutral-800">
              <h2 className="type-section-title">4. Send for review</h2>
              <label className="label mt-3" htmlFor="note">Why is this change needed?</label>
              <textarea id="note" rows={3} className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="What decision does this support?" />
              <div className="mt-3 flex items-center gap-3">
                <button className="btn btn-primary" disabled={note.trim().length < 5 || submit.isPending} onClick={() => submit.mutate()}>
                  {submit.isPending ? 'Submitting…' : 'Submit for Data Team review'}
                </button>
                <p className="type-muted">Nothing changes in production until the data team approves it.</p>
              </div>
            </div>
          ) : (
            <div className="mt-6 space-y-3 border-t border-neutral-100 pt-5 dark:border-neutral-800">
              <Banner kind="success">Submitted. The fields are locked while the data team reviews it.</Banner>
              <div className="flex gap-2">
                <button className="btn btn-primary" onClick={() => go('/app/changes')}>Follow it in My Changes</button>
                <Link to={path.section(view, 'metrics')} className="btn btn-outline">Back to Metrics</Link>
              </div>
            </div>
          )}
        </motion.section>
      )}
    </>
  )
}
