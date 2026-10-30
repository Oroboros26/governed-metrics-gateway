import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { listChanges, type Change } from '../lib/mock'
import { useRole } from '../lib/role'
import { path } from '../lib/views'
import { Banner, EmptyState, ErrorState, PageHeader, Skeleton, StatusBadge, Timeline } from '../components/ui'
import { Icon } from '../components/Icon'

const ORDER = { sent_back: 0, analyst_review: 1, mr_open: 2, live: 3 } as const
const FILTERS = [['all', 'All'], ['sent_back', 'Sent back'], ['analyst_review', 'With the analyst'], ['mr_open', 'Merge request'], ['live', 'Live']] as const
type F = (typeof FILTERS)[number][0]

export default function MyChanges() {
  const { persona } = useRole()
  const { data: all, isLoading, isError, error, refetch } = useQuery({ queryKey: ['changes'], queryFn: listChanges })
  const [f, setF] = useState<F>('all')
  const [open, setOpen] = useState<string | null>(null)
  const mine = (all ?? []).filter((c) => c.by === persona.name).sort((a, b) => ORDER[a.stage] - ORDER[b.stage])
  const rows = mine.filter((c) => f === 'all' || c.stage === f)
  const count = (k: F) => (k === 'all' ? mine.length : mine.filter((c) => c.stage === k).length)
  const sel = mine.find((c) => c.id === open)
  const backCount = count('sent_back')

  return (
    <>
      <PageHeader title="My Changes" sub="Everything you have asked for, and where it stands." />
      {isLoading && <div className="space-y-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-14" />)}</div>}
      {isError && <ErrorState message={(error as Error).message} onRetry={() => refetch()} />}
      {all && mine.length === 0 && <EmptyState title="No changes yet" hint="When you edit or add something and submit it, it shows up here with its status." action={<Link to={path.section('d2c', 'overview')} className="btn btn-primary">Browse the Semantic Layer</Link>} />}
      {mine.length > 0 && (
        <>
          {backCount > 0 && <div className="mb-3"><Banner kind="warn">{backCount} request{backCount > 1 ? 's were' : ' was'} sent back and need{backCount > 1 ? '' : 's'} your attention.</Banner></div>}
          <div role="group" aria-label="Show" className="mb-3 flex flex-wrap gap-1.5">
            {FILTERS.map(([k, l]) => (
              <button key={k} aria-pressed={f === k} onClick={() => setF(k)}
                className={`rounded-full border px-3 py-1 text-xs font-medium ${f === k ? 'border-accent-500 bg-accent-50 text-accent-700 dark:bg-accent-500/10 dark:text-accent-300' : 'border-neutral-200 text-neutral-600 dark:border-neutral-800 dark:text-neutral-400'}`}>{l} <span className="tabular-nums opacity-70">{count(k)}</span></button>
            ))}
          </div>
          {rows.length === 0 ? <EmptyState title="Nothing here" hint="No requests in this group." /> : (
            <ul className="divide-y divide-neutral-100 rounded-xl border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
              {rows.map((c) => {
                const last = c.events[c.events.length - 1]
                return (
                  <li key={c.id}>
                    <button onClick={() => setOpen(c.id)} aria-haspopup="dialog" className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-left hover:bg-neutral-50 dark:hover:bg-neutral-900">
                      <span className="min-w-0 flex-1 basis-64"><span className="flex flex-wrap items-center gap-2"><span className="truncate text-sm font-medium">{c.title}</span><span className="badge badge-neutral">{c.area}{c.action === 'create' ? ' · new' : ''}</span></span>
                        <span className="type-muted mt-0.5 block truncate">“{c.note}”</span></span>
                      <span className="flex items-center gap-3"><span className="type-muted hidden sm:inline">{last?.when}</span><StatusBadge c={c} /><Icon name="chevron" className="h-4 w-4 -rotate-90 text-neutral-400" /></span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}
      <AnimatePresence>{sel && <Details c={sel} onClose={() => setOpen(null)} />}</AnimatePresence>
    </>
  )
}

function Details({ c, onClose }: { c: Change; onClose: () => void }) {
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k) }, [onClose])
  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-30 bg-black/30" onClick={onClose} />
      <motion.aside role="dialog" aria-label={`${c.title} details`} initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 40, opacity: 0 }} transition={{ duration: 0.18 }}
        className="fixed inset-y-0 right-0 z-40 w-full max-w-lg overflow-y-auto border-l border-neutral-200 bg-white p-6 shadow-xl dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-start justify-between gap-3"><div><span className="badge badge-neutral">{c.area}{c.action === 'create' ? ' · new' : ''}</span><h2 className="mt-1.5 text-lg font-semibold tracking-tight">{c.title}</h2></div><button className="btn btn-ghost !px-1.5" onClick={onClose} aria-label="Close"><Icon name="x" /></button></div>
        <div className="mt-2 flex items-center gap-2"><StatusBadge c={c} />{c.mrId && <span className="type-mono">{c.mrId}</span>}</div>
        <p className="type-muted mt-3">Submitted {c.submitted} · “{c.note}”</p>
        <Timeline c={c} />
        {c.stage === 'sent_back' && (
          <div className="mt-4 space-y-3"><Banner kind="error"><b>Note:</b> {c.reason}</Banner>
            <Link to={c.area === 'Semantic view' ? path.section(c.view, 'overview') : c.kind === 'description' ? path.section('d2c', 'tables') : path.edit('d2c', c.metric)} className="btn btn-primary">{c.area === 'Semantic view' ? 'Open the view' : 'Fix and resubmit'}</Link></div>
        )}
        {c.stage === 'live' && <Link to={c.area === 'Semantic view' ? path.section(c.view, 'overview') : c.kind === 'description' ? path.section('d2c', 'tables') : path.metric('d2c', c.metric)} className="btn btn-outline mt-4">{c.kind === 'description' ? 'View in the Semantic Layer' : 'View the live metric'}</Link>}
        <h3 className="type-label-caps mt-6">History</h3>
        <ol className="mt-2 space-y-2 border-l-2 border-neutral-100 pl-4 dark:border-neutral-800">{c.events.map((e, i) => <li key={i} className="text-sm">{e.text}<span className="type-muted block">{e.when}</span></li>)}</ol>
      </motion.aside>
    </>
  )
}
