import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { invite, listPeople, removePerson, setScope, type Person } from '../../lib/people'
import { useRole } from '../../lib/role'
import { Banner, EmptyState, PageHeader, Skeleton } from '../../components/ui'
import { Icon } from '../../components/Icon'
import ScopePicker from '../../components/ScopePicker'

export default function MyTeam() {
  const qc = useQueryClient()
  const { persona } = useRole()
  const { data, isLoading } = useQuery({ queryKey: ['people'], queryFn: listPeople })
  const me = data?.find((p) => p.name === persona.name)
  const team = (data ?? []).filter((p) => p.parent === me?.id)
  const [edit, setEdit] = useState<Person | 'new' | null>(null)
  const rm = useMutation({ mutationFn: removePerson, onSuccess: () => qc.invalidateQueries({ queryKey: ['people'] }) })
  return (
    <>
      <PageHeader title="My team" sub="The business users you work with. They see only the tables you give them, never more than you can see yourself."
        action={<button className="btn btn-primary" onClick={() => setEdit('new')}><Icon name="plus" /> Invite a business user</button>} />
      {isLoading && <Skeleton className="h-40" />}
      {me && <Banner kind="info">Your own scope comes from your warehouse role <b>{me.whRole}</b>: {me.tables.length} tables.</Banner>}
      {data && team.length === 0 && <div className="mt-4"><EmptyState title="No one yet" hint="Invite the business users who need to ask for metrics, filters and rules." /></div>}
      <ul className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {team.map((p) => (
          <motion.li key={p.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="card !p-4">
            <div className="flex items-start justify-between gap-2"><div><p className="text-sm font-medium">{p.name}</p><p className="type-muted">{p.email}</p></div>{p.status === 'invited' ? <span className="badge badge-warn">Invited</span> : <span className="badge badge-success">Active</span>}</div>
            <p className="type-muted mt-3">{p.tables.length} of {me?.tables.length} tables · since {p.since}</p>
            <div className="mt-3 flex gap-1 border-t border-neutral-100 pt-2 dark:border-neutral-800">
              <button className="btn btn-ghost !px-2 !py-1 text-xs" onClick={() => setEdit(p)}>Change their tables</button>
              <button className="btn btn-ghost !px-2 !py-1 text-xs" onClick={() => { if (window.confirm(`Remove ${p.name}'s access?`)) rm.mutate(p.id) }}>Remove</button>
            </div>
          </motion.li>
        ))}
      </ul>
      <AnimatePresence>{edit && me && <Panel key={typeof edit === 'string' ? 'new' : edit.id} me={me} person={edit === 'new' ? undefined : edit} onClose={() => setEdit(null)} />}</AnimatePresence>
    </>
  )
}

function Panel({ me, person, onClose }: { me: Person; person?: Person; onClose: () => void }) {
  const qc = useQueryClient()
  const [name, setName] = useState(person?.name ?? ''); const [email, setEmail] = useState(person?.email ?? '')
  const [tables, setTables] = useState(person?.tables ?? me.tables)
  const save = useMutation({
    mutationFn: () => (person ? setScope(person.id, tables) : invite({ name: name.trim(), email: email.trim(), role: 'business', parent: me.id, views: me.views, tables })),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['people'] }); onClose() },
  })
  const ok = person ? tables.length > 0 : name.trim().length > 1 && /\S+@\S+\.\S+/.test(email) && tables.length > 0
  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-30 bg-black/30" onClick={onClose} />
      <motion.aside role="dialog" aria-label={person ? `Tables for ${person.name}` : 'Invite a business user'} initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 40, opacity: 0 }} transition={{ duration: 0.18 }}
        className="fixed inset-y-0 right-0 z-40 w-full max-w-md overflow-y-auto border-l border-neutral-200 bg-white p-6 shadow-xl dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-start justify-between"><h2 className="text-lg font-semibold tracking-tight">{person ? `Tables for ${person.name}` : 'Invite a business user'}</h2><button className="btn btn-ghost !px-1.5" onClick={onClose} aria-label="Close"><Icon name="x" /></button></div>
        {!person && <>
          <label className="label mt-4" htmlFor="pn">Name *</label><input id="pn" className="input" value={name} onChange={(e) => setName(e.target.value)} />
          <label className="label mt-3" htmlFor="pe">Work email *</label><input id="pe" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
        </>}
        <div className="mt-4"><ScopePicker allowed={me.tables} value={tables} onChange={setTables} /></div>
        <p className="type-muted mt-3">Prototype: no email is sent.</p>
        <div className="mt-4 flex gap-2"><button className="btn btn-primary" disabled={!ok || save.isPending} onClick={() => save.mutate()}>{save.isPending ? 'Saving…' : person ? 'Save' : 'Send invitation'}</button><button className="btn btn-ghost" onClick={onClose}>Cancel</button></div>
      </motion.aside>
    </>
  )
}
