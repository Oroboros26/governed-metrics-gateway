import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { approveChanges, createMR, listChanges, rollback, sendBack, testChange, type Change } from '../../lib/workflow'
import { Banner, EmptyState, ErrorState, PageHeader, Skeleton, StatusBadge } from '../../components/ui'
import { Icon } from '../../components/Icon'
import Diff from '../../components/Diff'
import NewFolder from '../../components/NewFolder'

const FILTERS = [['review', 'Needs my review'], ['mr', 'In a merge request'], ['back', 'Sent back'], ['live', 'Live'], ['all', 'All']] as const
type F = (typeof FILTERS)[number][0]
const match = (f: F, c: Change) => f === 'all' || (f === 'review' && c.stage === 'analyst_review') || (f === 'mr' && c.stage === 'mr_open') || (f === 'back' && c.stage === 'sent_back') || (f === 'live' && c.stage === 'live')

export default function ReviewQueue() {
  const qc = useQueryClient()
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: ['changes'], queryFn: listChanges })
  const [f, setF] = useState<F>('review')
  const [sel, setSel] = useState<string[]>([])
  const [open, setOpen] = useState<string | null>(null)
  const [panel, setPanel] = useState<'mr' | 'back' | null>(null)
  const done = () => { qc.invalidateQueries({ queryKey: ['changes'] }); qc.invalidateQueries({ queryKey: ['mrs'] }) }
  const test = useMutation({ mutationFn: testChange, onSuccess: done })
  const approve = useMutation({ mutationFn: approveChanges, onSuccess: () => { done(); setSel([]) } })
  const back = useMutation({ mutationFn: (id: string) => rollback(id), onSuccess: done })

  const rows = useMemo(() => (data ?? []).filter((c) => match(f, c)), [data, f])
  const chosen = (data ?? []).filter((c) => sel.includes(c.id))
  const allEng = chosen.length > 0 && chosen.every((c) => c.tier === 'engineering')
  const allTested = chosen.every((c) => c.tested)
  const allAnalyst = chosen.length > 0 && chosen.every((c) => c.tier === 'analyst')
  const count = (x: F) => (data ?? []).filter((c) => match(x, c)).length
  const toggle = (id: string) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))

  return (
    <>
      <PageHeader title="Review queue" sub="What your business users asked for. Test it, then approve it, group it into one merge request, or send it back." />
      <div role="group" aria-label="Show" className="mb-4 flex flex-wrap gap-1.5">
        {FILTERS.map(([k, l]) => (
          <button key={k} aria-pressed={f === k} onClick={() => { setF(k); setSel([]) }}
            className={`rounded-full border px-3 py-1 text-xs font-medium ${f === k ? 'border-accent-500 bg-accent-50 text-accent-700 dark:bg-accent-500/10 dark:text-accent-300' : 'border-neutral-200 text-neutral-600 dark:border-neutral-800 dark:text-neutral-400'}`}>{l} <span className="tabular-nums opacity-70">{data ? count(k) : ''}</span></button>
        ))}
      </div>
      {isLoading && <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-24" />)}</div>}
      {isError && <ErrorState message={(error as Error).message} onRetry={() => refetch()} />}
      {data && rows.length === 0 && <EmptyState title="Nothing here" hint={f === 'review' ? 'No requests are waiting for you. Nice.' : 'No changes match this filter.'} />}
      <ul className="space-y-3 pb-24">
        {rows.map((c) => {
          const can = c.stage === 'analyst_review'
          return (
            <li key={c.id} className="card !p-4">
              <div className="flex items-start gap-3">
                {can ? <input type="checkbox" className="mt-1" checked={sel.includes(c.id)} onChange={() => toggle(c.id)} aria-label={`Select ${c.title}`} /> : <span className="w-4" />}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="badge badge-neutral">{c.area}{c.action === 'create' ? ' · new' : ''}</span>
                    <span className="text-sm font-medium">{c.title}</span>
                  </div>
                  <p className="type-muted mt-1">From {c.by} · {c.submitted} · “{c.note}”</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <StatusBadge c={c} />
                    {c.tier === 'analyst' ? <span className="badge badge-neutral">You can approve it yourself</span> : <span className="badge badge-info">Goes to engineering{c.mrId ? ` · ${c.mrId}` : ''}</span>}
                    {c.tier === 'engineering' && (c.tested ? <span className="badge badge-success">7-day test passed</span> : can && <button className="btn btn-outline !py-0.5 text-xs" disabled={test.isPending && test.variables === c.id} onClick={() => test.mutate(c.id)}>{test.isPending && test.variables === c.id ? 'Testing…' : 'Run 7-day test'}</button>)}
                    {c.stage === 'sent_back' && c.reason && <span className="type-muted">“{c.reason}”</span>}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  {c.tier === 'engineering' && <button className="btn btn-ghost !px-2 !py-1 text-xs" aria-expanded={open === c.id} onClick={() => setOpen(open === c.id ? null : c.id)}>{open === c.id ? 'Hide changes' : 'See changes'}</button>}
                  {c.stage === 'live' && c.tier === 'engineering' && <button className="btn btn-outline !px-2 !py-1 text-xs" disabled={back.isPending} onClick={() => back.mutate(c.id)}>Roll back</button>}
                </div>
              </div>
              {open === c.id && <div className="mt-3 pl-7">{c.area === 'Semantic view' ? <><NewFolder viewId={c.view} /><Link to={`/app/v/${c.view}/overview`} className="btn btn-outline mt-2 !py-1 text-xs">Open the view</Link></> : <Diff c={c} />}</div>}
            </li>
          )
        })}
      </ul>

      <AnimatePresence>
        {sel.length > 0 && (
          <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} transition={{ duration: 0.15 }}
            className="fixed bottom-4 left-1/2 z-20 flex w-[min(720px,calc(100vw-2rem))] -translate-x-1/2 flex-wrap items-center gap-2 rounded-xl border border-neutral-200 bg-white p-3 shadow-xl dark:border-neutral-700 dark:bg-neutral-900" role="region" aria-label="Selected changes">
            <span className="mr-auto text-sm font-medium">{sel.length} selected</span>
            {allAnalyst && <button className="btn btn-primary" disabled={approve.isPending} onClick={() => approve.mutate(sel)}>{approve.isPending ? 'Approving…' : 'Approve'}</button>}
            {allEng && <button className="btn btn-primary" disabled={!allTested} title={allTested ? undefined : 'Run the 7-day test on every selected change first'} onClick={() => setPanel('mr')}><Icon name="changes" /> Create one merge request</button>}
            {!allAnalyst && !allEng && <span className="type-muted">Select changes of one kind to approve them together.</span>}
            {allEng && !allTested && <span className="type-muted">Run the test on each first.</span>}
            <button className="btn btn-outline" onClick={() => setPanel('back')}>Send back…</button>
            <button className="btn btn-ghost" onClick={() => setSel([])}>Clear</button>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>{panel === 'mr' && <MRPanel changes={chosen} onRemove={(id) => setSel((s) => s.filter((x) => x !== id))} onClose={() => setPanel(null)} onDone={() => { done(); setSel([]) }} />}</AnimatePresence>
      <AnimatePresence>{panel === 'back' && <BackPanel changes={chosen} onClose={() => setPanel(null)} onDone={() => { done(); setSel([]); setPanel(null) }} />}</AnimatePresence>
    </>
  )
}

function Shell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-30 bg-black/30" onClick={onClose} />
      <motion.aside role="dialog" aria-label={title} initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 40, opacity: 0 }} transition={{ duration: 0.18 }}
        className="fixed inset-y-0 right-0 z-40 w-full max-w-lg overflow-y-auto border-l border-neutral-200 bg-white p-6 shadow-xl dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-start justify-between gap-3"><h2 className="text-lg font-semibold tracking-tight">{title}</h2><button className="btn btn-ghost !px-1.5" onClick={onClose} aria-label="Close"><Icon name="x" /></button></div>
        {children}
      </motion.aside>
    </>
  )
}

function MRPanel({ changes, onRemove, onClose, onDone }: { changes: Change[]; onRemove: (id: string) => void; onClose: () => void; onDone: () => void }) {
  const [title, setTitle] = useState(`${changes.length} change${changes.length > 1 ? 's' : ''} to D2C`)
  const make = useMutation({ mutationFn: () => createMR(changes.map((c) => c.id), title), onSuccess: onDone })
  return (
    <Shell title="Create one merge request" onClose={onClose}>
      {make.isSuccess ? (
        <div className="mt-5 space-y-3">
          <Banner kind="success">Merge request <b>{make.data}</b> is open. Engineering can see it now, with the changes and the test results.</Banner>
          <div className="flex gap-2"><Link to={`/app/mrs/${make.data}`} className="btn btn-primary">Open {make.data}</Link><button className="btn btn-ghost" onClick={onClose}>Close</button></div>
        </div>
      ) : (
        <>
          <p className="type-muted mt-2">One merge request for all of these, so engineering reviews them once.</p>
          <label className="label mt-4" htmlFor="mrt">Title</label>
          <input id="mrt" className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
          <ul className="mt-4 divide-y divide-neutral-100 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
            {changes.map((c) => (
              <li key={c.id} className="flex items-start justify-between gap-2 px-3 py-2.5">
                <div><p className="text-sm font-medium">{c.title}</p><p className="type-muted">{c.by} · <span className="text-emerald-600 dark:text-emerald-400">7-day test passed</span></p></div>
                {changes.length > 1 && <button className="btn btn-ghost !px-2 !py-1 text-xs" onClick={() => onRemove(c.id)}>Remove</button>}
              </li>
            ))}
          </ul>
          {make.isError && <div className="mt-3"><Banner kind="error">{(make.error as Error).message}</Banner></div>}
          <div className="mt-5 flex gap-2">
            <button className="btn btn-primary" disabled={title.trim().length < 3 || make.isPending || changes.length === 0} onClick={() => make.mutate()}>{make.isPending ? 'Opening…' : 'Submit to engineering'}</button>
            <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          </div>
        </>
      )}
    </Shell>
  )
}

function BackPanel({ changes, onClose, onDone }: { changes: Change[]; onClose: () => void; onDone: () => void }) {
  const [why, setWhy] = useState('')
  const send = useMutation({ mutationFn: () => sendBack(changes.map((c) => c.id), why.trim()), onSuccess: onDone })
  return (
    <Shell title={`Send back ${changes.length} change${changes.length > 1 ? 's' : ''}`} onClose={onClose}>
      <p className="type-muted mt-2">The business user sees your comment on their timeline and can fix and resubmit.</p>
      <label className="label mt-4" htmlFor="bk">What should they change? *</label>
      <textarea id="bk" rows={4} className="input" value={why} onChange={(e) => setWhy(e.target.value)} />
      <div className="mt-4 flex gap-2"><button className="btn btn-primary" disabled={why.trim().length < 5 || send.isPending} onClick={() => send.mutate()}>{send.isPending ? 'Sending…' : 'Send back'}</button><button className="btn btn-ghost" onClick={onClose}>Cancel</button></div>
    </Shell>
  )
}
