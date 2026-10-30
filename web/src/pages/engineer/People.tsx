import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ROLE_TABLES, invite, listPeople, removePerson } from '../../lib/people'
import { getViews } from '../../lib/views'
import { PageHeader, Skeleton } from '../../components/ui'
import { Icon } from '../../components/Icon'

export default function People() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['people'], queryFn: listPeople })
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [openIds, setOpenIds] = useState<Set<string>>(new Set())
  const rm = useMutation({ mutationFn: removePerson, onSuccess: () => qc.invalidateQueries({ queryKey: ['people'] }) })
  const eng = data?.filter((p) => p.role === 'engineer') ?? [], analysts = data?.filter((p) => p.role === 'analyst') ?? []
  const pending = data?.filter((p) => p.status === 'invited').length ?? 0
  const shown = analysts.filter((a) => { const t = q.trim().toLowerCase(); return !t || `${a.name} ${a.email}`.toLowerCase().includes(t) || data?.some((p) => p.parent === a.id && `${p.name} ${p.email}`.toLowerCase().includes(t)) })
  return (
    <>
      <PageHeader title="People and access" sub="Who works with which semantic view. You see the team and their scope, not what they do day to day."
        action={<button className="btn btn-primary" onClick={() => setOpen(true)}><Icon name="plus" /> Invite a data analyst</button>} />
      {isLoading && <Skeleton className="h-64" />}
      {data && (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <input className="input max-w-xs" aria-label="Find a person" placeholder="Find a person" value={q} onChange={(e) => setQ(e.target.value)} />
            <span className="type-muted">{analysts.length} data analysts · {data.filter((p) => p.role === 'business').length} business users{pending ? ` · ${pending} invitation${pending > 1 ? 's' : ''} pending` : ''}</span>
            <button className="btn btn-ghost ml-auto !py-1 text-xs" onClick={() => setOpenIds(openIds.size ? new Set() : new Set(analysts.map((a) => a.id)))}>{openIds.size ? 'Collapse all' : 'Expand all'}</button>
          </div>
          {eng.map((e) => (
            <div key={e.id} className="card !p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><span className="badge badge-accent">Data engineering</span><p className="mt-1 text-sm font-medium">{e.name} <span className="type-muted">· {e.email}</span></p></div><span className="type-muted">Sees all {e.views.length} views · {e.tables.length} tables</span></div></div>
          ))}
          <ul className="mt-2 divide-y divide-neutral-100 rounded-xl border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
            {shown.length === 0 && <li className="p-4 text-sm text-neutral-500">No one matches “{q}”.</li>}
            {shown.map((a) => {
              const team = data.filter((p) => p.parent === a.id)
              const isOpen = openIds.has(a.id) || !!q.trim()
              return (
                <li key={a.id}>
                  <button className="flex w-full flex-wrap items-center gap-3 px-4 py-3 text-left hover:bg-neutral-50 dark:hover:bg-neutral-900" aria-expanded={isOpen} onClick={() => setOpenIds((o) => { const n = new Set(o); n.has(a.id) ? n.delete(a.id) : n.add(a.id); return n })}>
                    <Icon name="chevron" className={`h-4 w-4 shrink-0 transition-transform ${isOpen ? '' : '-rotate-90'}`} />
                    <span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2"><span className="badge badge-info">Data analyst</span><span className="text-sm font-medium">{a.name}</span>{a.status === 'invited' && <span className="badge badge-warn">Invited</span>}</span>
                      <span className="type-muted mt-0.5 block">{a.email} · views: {a.views.join(', ')}</span></span>
                    <span className="type-muted text-right">{team.length} business user{team.length === 1 ? '' : 's'}<br />{a.tables.length} tables · <span className="type-mono">{a.whRole}</span></span>
                  </button>
                  {isOpen && (
                    <div className="border-t border-neutral-100 bg-neutral-50/60 px-4 py-3 pl-11 dark:border-neutral-800 dark:bg-neutral-900/40">
                      <ul className="space-y-1.5">
                        {team.length === 0 && <li className="type-muted">No business users yet.</li>}
                        {team.filter((b) => !q.trim() || `${b.name} ${b.email}`.toLowerCase().includes(q.toLowerCase()) || a.name.toLowerCase().includes(q.toLowerCase())).map((b) => <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 text-sm"><span><span className="badge badge-neutral mr-2">Business user</span>{b.name}{b.status === 'invited' && <span className="badge badge-warn ml-2">Invited</span>}</span><span className="type-muted">{b.tables.length} of {a.tables.length} tables</span></li>)}
                      </ul>
                      <button className="btn btn-ghost mt-2 !px-2 !py-1 text-xs" onClick={() => { if (window.confirm(`Remove ${a.name} and their business users?`)) rm.mutate(a.id) }}>Remove access</button>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </>
      )}
      <AnimatePresence>{open && <Invite onClose={() => setOpen(false)} />}</AnimatePresence>
    </>
  )
}

function Invite({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const views = getViews()
  const [name, setName] = useState(''); const [email, setEmail] = useState('')
  const [role, setRole] = useState(Object.keys(ROLE_TABLES)[0]); const [vs, setVs] = useState<string[]>([views[0].id])
  const save = useMutation({ mutationFn: () => invite({ name: name.trim(), email: email.trim(), role: 'analyst', parent: 'ravi', views: vs, tables: ROLE_TABLES[role], whRole: role }), onSuccess: () => { qc.invalidateQueries({ queryKey: ['people'] }); onClose() } })
  const ok = name.trim().length > 1 && /\S+@\S+\.\S+/.test(email) && vs.length > 0
  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-30 bg-black/30" onClick={onClose} />
      <motion.aside role="dialog" aria-label="Invite a data analyst" initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 40, opacity: 0 }} transition={{ duration: 0.18 }}
        className="fixed inset-y-0 right-0 z-40 w-full max-w-md overflow-y-auto border-l border-neutral-200 bg-white p-6 shadow-xl dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-start justify-between"><h2 className="text-lg font-semibold tracking-tight">Invite a data analyst</h2><button className="btn btn-ghost !px-1.5" onClick={onClose} aria-label="Close"><Icon name="x" /></button></div>
        <label className="label mt-4" htmlFor="an">Name *</label><input id="an" className="input" value={name} onChange={(e) => setName(e.target.value)} />
        <label className="label mt-3" htmlFor="ae">Work email *</label><input id="ae" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
        <label className="label mt-3" htmlFor="ar">Warehouse role</label>
        <select id="ar" className="input" value={role} onChange={(e) => setRole(e.target.value)}>{Object.keys(ROLE_TABLES).map((r) => <option key={r} value={r}>{r}</option>)}</select>
        <p className="type-muted mt-1">Their scope is what this role can see in the warehouse: {ROLE_TABLES[role].length} tables.</p>
        <fieldset className="mt-3"><legend className="label">Semantic views they work on *</legend>
          {views.map((v) => <label key={v.id} className="flex items-center gap-2 py-0.5 text-sm"><input type="checkbox" checked={vs.includes(v.id)} onChange={() => setVs(vs.includes(v.id) ? vs.filter((x) => x !== v.id) : [...vs, v.id])} />{v.name}</label>)}
        </fieldset>
        <p className="type-muted mt-3">Prototype: no email is sent.</p>
        <div className="mt-4 flex gap-2"><button className="btn btn-primary" disabled={!ok || save.isPending} onClick={() => save.mutate()}>{save.isPending ? 'Saving…' : 'Send invitation'}</button><button className="btn btn-ghost" onClick={onClose}>Cancel</button></div>
      </motion.aside>
    </>
  )
}
