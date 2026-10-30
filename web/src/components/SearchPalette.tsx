import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { getSemanticView, label } from '../lib/semantic'
import { listMetrics } from '../lib/mock'
import { path } from '../lib/views'
import { Icon } from './Icon'

export default function SearchPalette({ open, onClose, view }: { open: boolean; onClose: () => void; view: string }) {
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const ref = useRef<HTMLInputElement>(null)
  const sem = useQuery({ queryKey: ['semantic', view], queryFn: () => getSemanticView(view) }).data
  const metrics = useQuery({ queryKey: ['metrics', view], queryFn: () => listMetrics(view) }).data
  useEffect(() => { if (open) { setQ(''); setTimeout(() => ref.current?.focus(), 30) } }, [open])
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k) }, [onClose])

  const items = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s || !sem) return []
    const has = (...x: (string | undefined)[]) => x.join(' ').toLowerCase().includes(s)
    const out: { kind: string; title: string; sub?: string; to: string }[] = []
    sem.tables.forEach((t) => t.fields.forEach((f) => { if (out.filter((o) => o.kind === 'Field').length < 6 && has(f.name, label(f.name), f.description, ...(f.synonyms ?? []))) out.push({ kind: 'Field', title: label(f.name), sub: `${t.label}`, to: path.section(view, 'tables', { table: t.id, field: f.name }) }) }))
    ;(metrics ?? []).filter((m) => has(m.title, m.description, ...(m.synonyms ?? []))).slice(0, 4).forEach((m) => out.push({ kind: 'Metric', title: m.title, sub: m.description, to: path.metric(view, m.name) }))
    sem.filters.filter((f) => has(f.label, f.meaning, ...f.synonyms)).slice(0, 4).forEach((f) => out.push({ kind: 'Filter', title: f.label, sub: f.meaning, to: path.section(view, 'filters') }))
    sem.rules.filter((r) => has(r.title, r.body)).slice(0, 4).forEach((r) => out.push({ kind: 'Rule', title: r.title, sub: r.topic, to: path.section(view, 'rules') }))
    sem.questions.filter((x) => has(x.text)).slice(0, 4).forEach((x) => out.push({ kind: 'Verified query', title: x.text, sub: x.topic, to: path.section(view, 'queries') }))
    return out
  }, [q, sem, metrics, view])

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/40" onClick={onClose} />
          <motion.div role="dialog" aria-label="Search" initial={{ opacity: 0, y: -8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.12 }}
            className="fixed left-1/2 top-[15vh] z-50 w-[92vw] max-w-xl -translate-x-1/2 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex items-center gap-2 border-b border-neutral-200 px-4 dark:border-neutral-800">
              <Icon name="search" className="h-4 w-4 text-neutral-400" />
              <input ref={ref} value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search this view" placeholder="Search fields, metrics, filters, rules, verified queries"
                className="w-full bg-transparent py-3.5 text-sm outline-none placeholder:text-neutral-400" />
              <kbd className="rounded border border-neutral-200 px-1.5 text-[10px] text-neutral-500 dark:border-neutral-700">Esc</kbd>
            </div>
            <div className="max-h-[50vh] overflow-y-auto p-1.5" aria-live="polite">
              {view !== 'd2c' && <p className="p-4 text-sm text-neutral-500">This view is a sample with no content to search.</p>}
              {view === 'd2c' && !q.trim() && <p className="p-4 text-sm text-neutral-500">Type a word, such as "return", "channel" or "D2C".</p>}
              {view === 'd2c' && q.trim() && items.length === 0 && <p className="p-4 text-sm text-neutral-500">Nothing found for "{q}". Try a simpler word.</p>}
              {items.map((it, i) => (
                <button key={i} onClick={() => { nav(it.to); onClose() }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800">
                  <span className="badge badge-neutral w-20 shrink-0 justify-center">{it.kind}</span>
                  <span className="min-w-0"><span className="block truncate text-sm font-medium">{it.title}</span>{it.sub && <span className="type-muted block truncate">{it.sub}</span>}</span>
                </button>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
