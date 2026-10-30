import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { KIND_LABEL, coverage, label, type Field, type FieldKind, type SemTable, type SemanticView } from '../../lib/semantic'
import { suggestChange } from '../../lib/mock'
import { Banner, EmptyState } from '../../components/ui'
import { Icon } from '../../components/Icon'
import { Link } from 'react-router-dom'
import { useRole } from '../../lib/role'

const KINDS: [FieldKind | 'all', string][] = [['all', 'All'], ['slice', 'Ways to slice'], ['number', 'Numbers'], ['date', 'Dates'], ['kpi', 'KPIs']]

type TProps = { view: SemanticView; tableId?: string; fieldName?: string; gaps: boolean; go: (p: Record<string, string>) => void }
export default function Tables(p: TProps) {
  return p.view.tables.length ? <TablesInner {...p} /> : <EmptyState title="No tables yet" hint="Import a YAML file from the Overview page to add tables." />
}

function TablesInner({ view, tableId, fieldName, gaps, go }: TProps) {
  const t = view.tables.find((x) => x.id === tableId) ?? view.tables[0]
  const [kind, setKind] = useState<FieldKind | 'all'>('all')
  const [q, setQ] = useState('')
  const [onlyGaps, setOnlyGaps] = useState(gaps)
  const [showRestricted, setShowRestricted] = useState(false)
  useEffect(() => { setKind('all'); setQ(''); setShowRestricted(false) }, [t.id])
  useEffect(() => setOnlyGaps(gaps), [gaps])

  const matches = useMemo(() => t.fields.filter((f) =>
    (kind === 'all' || f.kind === kind) && (!onlyGaps || (!f.description && !f.restricted)) &&
    `${f.name} ${label(f.name)} ${f.description ?? ''} ${(f.synonyms ?? []).join(' ')}`.toLowerCase().includes(q.trim().toLowerCase())), [t, kind, q, onlyGaps])
  const normal = matches.filter((f) => !f.restricted)
  const restricted = matches.filter((f) => f.restricted)
  const open = t.fields.find((f) => f.name === fieldName)
  const cov = coverage(t.fields)
  const groups = [...new Set(view.tables.map((x) => x.group))]
  const clear = () => { setQ(''); setKind('all'); setOnlyGaps(false) }

  return (
    <div className="grid min-h-[420px] gap-4 lg:h-[calc(100vh-14rem)] lg:grid-cols-[240px_1fr]">
      <nav aria-label="Tables" className="space-y-4 lg:overflow-y-auto lg:pr-1">
        {groups.map((g) => (
          <div key={g}>
            <p className="type-label-caps mb-1.5">{g}</p>
            {view.tables.filter((x) => x.group === g).map((x) => (
              <button key={x.id} onClick={() => go({ tab: 'tables', table: x.id })} aria-current={x.id === t.id}
                className={`mb-1 w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors ${x.id === t.id ? 'border-accent-500 bg-accent-50 dark:bg-accent-500/10' : 'border-neutral-200 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900'}`}>
                <span className="block font-medium">{x.label}</span>
                <span className="type-muted">{x.fields.length} fields · {coverage(x.fields).pct}% described</span>
              </button>
            ))}
          </div>
        ))}
      </nav>

      <section className="flex min-h-0 flex-col">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <div className="flex items-center gap-2"><h2 className="text-lg font-semibold tracking-tight">{t.label}</h2><span className="badge badge-neutral">{t.role === 'fact' ? 'Records of activity' : 'Reference list'}</span></div>
          <p className="type-muted"><span className="type-mono">{t.source}</span> · {t.fields.length} fields · {cov.pct}% described</p>
        </div>
        <p className="type-muted mt-1 text-sm">{t.description}</p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] max-w-sm flex-1">
            <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input className="input !pl-9" placeholder={`Search ${t.fields.length} fields`} aria-label="Search fields" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div role="group" aria-label="Type of field" className="flex flex-wrap gap-1">
            {KINDS.map(([k, l]) => (
              <button key={k} aria-pressed={kind === k} onClick={() => setKind(k)}
                className={`rounded-full border px-3 py-1 text-xs font-medium ${kind === k ? 'border-accent-500 bg-accent-50 text-accent-700 dark:bg-accent-500/10 dark:text-accent-300' : 'border-neutral-200 text-neutral-600 dark:border-neutral-800 dark:text-neutral-400'}`}>{l}</button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400">
            <input type="checkbox" checked={onlyGaps} onChange={(e) => setOnlyGaps(e.target.checked)} /> No description only
          </label>
        </div>

        {matches.length === 0 ? (
          <div className="mt-3"><EmptyState title="No fields match" hint="Try a different word, or clear the filters." action={<button className="btn btn-outline" onClick={clear}>Clear filters</button>} /></div>
        ) : (
          <div className="card mt-3 flex min-h-0 flex-1 flex-col !p-0">
            <div className={`${ROW} type-table-header border-b border-neutral-200 bg-neutral-50 py-2 dark:border-neutral-800 dark:bg-neutral-900`} role="row">
              <span>Field</span><span>Type</span><span>Description</span>
            </div>
            <ul className="min-h-0 flex-1 divide-y divide-neutral-100 overflow-y-auto dark:divide-neutral-800">
              {normal.map((f) => <FieldRow key={f.name} f={f} onOpen={() => go({ tab: 'tables', table: t.id, field: f.name })} />)}
              {restricted.length > 0 && (
                <li>
                  <button onClick={() => setShowRestricted((s) => !s)} aria-expanded={showRestricted} className="flex w-full items-center gap-2 bg-red-50/50 px-4 py-2 text-left text-xs font-medium text-red-700 hover:bg-red-50 dark:bg-red-500/5 dark:text-red-300">
                    <Icon name="chevron" className={`h-3 w-3 transition-transform ${showRestricted ? '' : '-rotate-90'}`} />
                    {restricted.length} restricted field{restricted.length > 1 ? 's' : ''} (identify individual consumers; hidden for your role)
                  </button>
                </li>
              )}
              {showRestricted && restricted.map((f) => <FieldRow key={f.name} f={f} onOpen={() => go({ tab: 'tables', table: t.id, field: f.name })} />)}
            </ul>
          </div>
        )}
      </section>

      <AnimatePresence>{open && <FieldPanel key={open.name} table={t} f={open} onClose={() => go({ tab: 'tables', table: t.id })} />}</AnimatePresence>
    </div>
  )
}

const ROW = 'grid grid-cols-[minmax(150px,1fr)_100px_minmax(0,2.5fr)] items-center gap-3 px-4'

function FieldRow({ f, onOpen }: { f: Field; onOpen: () => void }) {
  return (
    <li>
      <button onClick={onOpen} className={`${ROW} w-full py-2 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800/40`}>
        <span className="truncate text-sm font-medium" title={label(f.name)}>{label(f.name)}</span>
        <span><span className="badge badge-neutral">{KIND_LABEL[f.kind]}</span></span>
        {f.restricted ? <span className="truncate text-xs text-red-600 dark:text-red-300">Restricted: not shown or queryable for your role</span>
          : f.description ? <span className="type-muted truncate" title={f.description}>{f.description}</span>
          : <span className="text-xs font-medium text-amber-600 dark:text-amber-400">+ Add description</span>}
      </button>
    </li>
  )
}

function FieldPanel({ table, f, onClose }: { table: SemTable; f: Field; onClose: () => void }) {
  const { canEdit } = useRole()
  const qc = useQueryClient()
  const [desc, setDesc] = useState(f.description ?? '')
  const [syn, setSyn] = useState((f.synonyms ?? []).join(', '))
  const [note, setNote] = useState('')
  const send = useMutation({ mutationFn: () => suggestChange({ target: `${table.label} › ${label(f.name)}`, note }), onSuccess: () => qc.invalidateQueries({ queryKey: ['changes'] }) })
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k) }, [onClose])
  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-30 bg-black/30" onClick={onClose} />
      <motion.aside role="dialog" aria-label={`${label(f.name)} details`} initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 40, opacity: 0 }} transition={{ duration: 0.18 }}
        className="fixed inset-y-0 right-0 z-40 w-full max-w-md overflow-y-auto border-l border-neutral-200 bg-white p-6 shadow-xl dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="type-muted">{table.label}</p>
            <h2 className="mt-0.5 text-lg font-semibold tracking-tight">{label(f.name)}</h2>
          </div>
          <button className="btn btn-ghost !px-1.5" onClick={onClose} aria-label="Close"><Icon name="x" /></button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2"><span className="badge badge-neutral">{KIND_LABEL[f.kind]}</span><span className="badge badge-neutral">{f.type}</span>{f.restricted && <span className="badge badge-error">Restricted</span>}</div>
        <dl className="mt-5 space-y-4 text-sm">
          <div><dt className="type-label-caps">Meaning</dt><dd className="mt-1">{f.description ?? <span className="text-neutral-500">Nobody has described this field yet.</span>}</dd></div>
          <div><dt className="type-label-caps">Also known as</dt><dd className="mt-1">{f.synonyms?.length ? f.synonyms.join(', ') : <span className="text-neutral-500">No synonyms</span>}</dd></div>
          <div><dt className="type-label-caps">Column name</dt><dd className="type-mono mt-1">{f.name}</dd></div>
        </dl>

        {f.restricted ? (
          <div className="mt-6"><Banner kind="warn">This field identifies individual consumers. For privacy, values are never shown here and it can't be changed from this screen.</Banner></div>
        ) : !canEdit ? null : send.isSuccess ? (
          <div className="mt-6 space-y-3"><Banner kind="success">Sent. A reviewer will check it before it goes live.</Banner><Link to="/app/changes" className="btn btn-primary">Follow it in My Changes</Link></div>
        ) : (
          <div className="mt-6 border-t border-neutral-100 pt-5 dark:border-neutral-800">
            <h3 className="type-section-title">Suggest a change</h3>
            <label className="label mt-3" htmlFor="fd">Description</label>
            <textarea id="fd" rows={3} className="input" value={desc} onChange={(e) => setDesc(e.target.value)} />
            <label className="label mt-3" htmlFor="fs">Also known as (separate with commas)</label>
            <input id="fs" className="input" value={syn} onChange={(e) => setSyn(e.target.value)} />
            <label className="label mt-3" htmlFor="fn">Why?</label>
            <input id="fn" className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="What was unclear or missing?" />
            <button className="btn btn-primary mt-4" disabled={note.trim().length < 5 || (desc === (f.description ?? '') && syn === (f.synonyms ?? []).join(', ')) || send.isPending} onClick={() => send.mutate()}>
              {send.isPending ? 'Sending…' : 'Send for review'}
            </button>
          </div>
        )}
      </motion.aside>
    </>
  )
}
