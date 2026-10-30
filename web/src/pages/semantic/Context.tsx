import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { SUGGESTED_BLOCKS, getContext, type CtxSection } from '../../lib/context'
import { suggestChange } from '../../lib/mock'
import { Banner, EmptyState, ErrorState, Skeleton } from '../../components/ui'
import { Icon } from '../../components/Icon'
import { useRole } from '../../lib/role'

type Mode = 'view' | 'edit' | 'remove'

// One block of context. `s` is undefined for a new block.
function Block({ s, startTitle, onDone }: { s?: CtxSection; startTitle?: string; onDone?: () => void }) {
  const qc = useQueryClient()
  const { canEdit } = useRole()
  const [mode, setMode] = useState<Mode>(s ? 'view' : 'edit')
  const [title, setTitle] = useState(s?.title ?? startTitle ?? '')
  const [text, setText] = useState(s?.body ?? '')
  const [note, setNote] = useState('')
  const verb = !s ? 'Add block' : mode === 'remove' ? 'Remove block' : 'Edit block'
  const send = useMutation({ mutationFn: () => suggestChange({ target: `Context › ${verb}: ${title}`, note }), onSuccess: () => qc.invalidateQueries({ queryKey: ['changes'] }) })
  const reset = () => { setMode('view'); setTitle(s?.title ?? ''); setText(s?.body ?? ''); setNote(''); onDone?.() }
  const changed = !s || mode === 'remove' || title.trim() !== s.title || text.trim() !== s.body
  const ready = note.trim().length >= 5 && changed && (mode === 'remove' || (title.trim() && text.trim()))

  return (
    <article className="card">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h2 className="type-section-title">{s?.title ?? 'New block'}</h2>
        {canEdit && s && mode === 'view' && !send.isSuccess && (
          <div className="flex gap-1">
            <button className="btn btn-outline" onClick={() => setMode('edit')}>Suggest a change</button>
            <button className="btn btn-ghost" onClick={() => setMode('remove')} aria-label={`Remove ${s.title}`}>Remove</button>
          </div>
        )}
      </div>
      {s && mode === 'view' && !send.isSuccess && <p className="mt-2 text-sm leading-relaxed">{s.body}</p>}
      {mode === 'remove' && !send.isSuccess && <p className="mt-2 text-sm leading-relaxed text-neutral-500">{s?.body}</p>}
      {mode !== 'view' && !send.isSuccess && (
        <div className="mt-3">
          {mode === 'edit' && (
            <>
              <label className="label" htmlFor={`bt-${s?.id ?? 'new'}`}>Title</label>
              <input id={`bt-${s?.id ?? 'new'}`} className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
              <label className="label mt-3" htmlFor={`bb-${s?.id ?? 'new'}`}>Text, in everyday words</label>
              <textarea id={`bb-${s?.id ?? 'new'}`} rows={4} className="input" value={text} onChange={(e) => setText(e.target.value)} />
            </>
          )}
          <label className="label mt-3" htmlFor={`bn-${s?.id ?? 'new'}`}>{mode === 'remove' ? 'Why remove this block?' : 'What changed and why?'}</label>
          <input id={`bn-${s?.id ?? 'new'}`} className="input" value={note} onChange={(e) => setNote(e.target.value)} />
          <div className="mt-3 flex gap-2">
            <button className="btn btn-primary" disabled={!ready || send.isPending} onClick={() => send.mutate()}>{send.isPending ? 'Sending…' : 'Send for review'}</button>
            <button className="btn btn-ghost" onClick={reset}>Cancel</button>
          </div>
        </div>
      )}
      {send.isSuccess && <div className="mt-3 space-y-2"><Banner kind="success">Sent. Nothing changes until a reviewer approves it.</Banner><div className="flex gap-2"><Link to="/app/changes" className="btn btn-outline">Follow it in My Changes</Link><button className="btn btn-ghost" onClick={reset}>Close</button></div></div>}
    </article>
  )
}

export default function Context({ view }: { view: string }) {
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: ['context', view], queryFn: () => getContext(view) })
  const qc = useQueryClient()
  const { canEdit } = useRole()
  const [adding, setAdding] = useState<string | null>(null)
  const [menu, setMenu] = useState(false)
  const [term, setTerm] = useState(''); const [meaning, setMeaning] = useState('')
  const addTerm = useMutation({ mutationFn: () => suggestChange({ target: `Context › Glossary: ${term}`, note: meaning }), onSuccess: () => qc.invalidateQueries({ queryKey: ['changes'] }) })

  if (isLoading) return <div className="grid gap-4 lg:grid-cols-[1fr_380px]"><Skeleton className="h-72" /><Skeleton className="h-72" /></div>
  if (isError || !data) return <ErrorState message={(error as Error)?.message ?? 'Could not load the context.'} onRetry={() => refetch()} />

  const used = new Set(data.sections.map((x) => x.title))
  const suggestions = SUGGESTED_BLOCKS.filter((x) => !used.has(x))

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px] 2xl:grid-cols-[minmax(0,1fr)_440px]">
      <div className="space-y-4">
        {canEdit && <div className="relative flex justify-end">
          <button className="btn btn-primary" aria-haspopup="menu" aria-expanded={menu} onClick={() => setMenu((m) => !m)}><Icon name="plus" /> Add block</button>
          {menu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
              <ul role="menu" className="absolute right-0 top-full z-20 mt-1 w-64 rounded-xl border border-neutral-200 bg-white p-1.5 shadow-lg dark:border-neutral-800 dark:bg-neutral-900">
                {suggestions.map((x) => <li key={x}><button role="menuitem" className="btn btn-ghost w-full !justify-start" onClick={() => { setAdding(x); setMenu(false) }}>{x}</button></li>)}
                <li className="mt-1 border-t border-neutral-100 pt-1 dark:border-neutral-800"><button role="menuitem" className="btn btn-ghost w-full !justify-start" onClick={() => { setAdding(''); setMenu(false) }}>Blank block</button></li>
              </ul>
            </>
          )}
        </div>}
        {adding !== null && <Block key={adding} startTitle={adding} onDone={() => setAdding(null)} />}
        {data.sections.length === 0 && adding === null && <EmptyState title="No context for this view yet" hint="Add a block to explain, in everyday words, what this view is about. Everyone who opens this view will read it." />}
        <div className="grid gap-4 2xl:grid-cols-2">{data.sections.map((s) => <Block key={s.id} s={s} />)}</div>
      </div>

      <aside>
        <section className="card lg:sticky lg:top-4">
          <h2 className="type-section-title">Glossary</h2>
          <p className="type-muted mt-0.5">Terms and abbreviations used in this view.</p>
          {data.glossary.length === 0 ? <p className="mt-3 text-sm text-neutral-500">No terms yet.</p> : (
            <dl className="mt-3 max-h-[55vh] divide-y divide-neutral-100 overflow-y-auto dark:divide-neutral-800">
              {data.glossary.map((g) => <div key={g.term} className="grid grid-cols-[90px_1fr] gap-3 py-2 text-sm"><dt className="font-medium">{g.term}</dt><dd className="text-neutral-700 dark:text-neutral-300">{g.meaning}</dd></div>)}
            </dl>
          )}
          {canEdit && <div className="mt-4 border-t border-neutral-100 pt-4 dark:border-neutral-800">
            <h3 className="text-sm font-medium">Suggest a term</h3>
            {addTerm.isSuccess ? <div className="mt-2"><Banner kind="success">Sent for review. Follow it in <Link className="underline" to="/app/changes">My Changes</Link>.</Banner></div> : (
              <div className="mt-2 space-y-2">
                <input className="input" aria-label="Term" placeholder="Term" value={term} onChange={(e) => setTerm(e.target.value)} />
                <input className="input" aria-label="Meaning" placeholder="What it means here" value={meaning} onChange={(e) => setMeaning(e.target.value)} />
                <button className="btn btn-outline" disabled={!term.trim() || meaning.trim().length < 5 || addTerm.isPending} onClick={() => addTerm.mutate()}>{addTerm.isPending ? 'Sending…' : 'Send for review'}</button>
              </div>
            )}
          </div>}
        </section>
      </aside>
    </div>
  )
}
