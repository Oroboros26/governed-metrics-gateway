import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { getViews, hasData, path } from '../lib/views'
import { SEMANTIC, coverage, type SemanticView } from '../lib/semantic'
import { addCustomView, getStored, useStoreVersion } from '../lib/store'
import { listChanges } from '../lib/mock'
import { PageHeader } from '../components/ui'
import { useRole } from '../lib/role'

const dataOf = (id: string): SemanticView | null => (id === 'd2c' ? SEMANTIC : getStored(id)?.semantic ?? null)

export default function AllViews() {
  useStoreVersion()
  const { role } = useRole()
  const nav = useNavigate()
  const changes = useQuery({ queryKey: ['changes'], queryFn: listChanges }).data
  const inReview = changes?.filter((c) => c.status === 'in_review' && c.view === 'd2c').length ?? 0
  const [ask, setAsk] = useState(false); const [name, setName] = useState(''); const [desc, setDesc] = useState('')
  const views = getViews()
  const taken = views.some((v) => v.name.toLowerCase() === name.trim().toLowerCase())
  const create = () => {
    const id = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    addCustomView({ id, name: name.trim(), full: `${name.trim()} Semantic View`, description: desc.trim() || 'No description yet.', owner: 'You', updated: 'Just now' })
    nav(path.section(id, 'overview'))
  }
  return (
    <>
      <PageHeader title="All semantic views" sub="The views you can open. Each one covers one part of the business. Open an empty one to import a YAML file."
        action={!ask ? <button className="btn btn-primary" onClick={() => setAsk(true)}>Create a view</button> : undefined} />
      {ask && (
        <section className="card mb-4">
          <h2 className="type-section-title">Create a view</h2>
          <label className="label mt-3" htmlFor="vn">What should it be called?</label>
          <input id="vn" className="input max-w-sm" value={name} onChange={(e) => setName(e.target.value)} placeholder="For example: Marketing" />
          <label className="label mt-3" htmlFor="vw">What is it about? (optional)</label>
          <textarea id="vw" rows={2} className="input max-w-xl" value={desc} onChange={(e) => setDesc(e.target.value)} />
          {taken && <p role="alert" className="mt-2 text-xs text-red-600 dark:text-red-400">A view with this name already exists.</p>}
          <p className="type-muted mt-2">It is created empty, in this browser only. Import a YAML file to fill it.</p>
          <div className="mt-3 flex gap-2">
            <button className="btn btn-primary" disabled={name.trim().length < 2 || taken} onClick={create}>Create view</button>
            <button className="btn btn-ghost" onClick={() => setAsk(false)}>Cancel</button>
          </div>
        </section>
      )}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {views.map((v, i) => {
          const live = hasData(v.id), d = dataOf(v.id)
          const cov = d ? coverage(d.tables.flatMap((t) => t.fields)).pct : 0
          return (
            <motion.div key={v.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Link to={path.section(v.id, 'overview')} className="card block h-full transition-colors hover:border-accent-500/60">
                <div className="flex items-start justify-between gap-2"><h2 className="type-section-title">{v.full}</h2>{live ? <span className="badge badge-success">Live</span> : <span className="badge badge-neutral">Empty</span>}</div>
                <p className="type-muted mt-1.5">{v.description}</p>
                {live && d ? (
                  <div className="mt-4">
                    <div className="h-1.5 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800"><div className="h-full rounded-full bg-accent-500" style={{ width: `${cov}%` }} /></div>
                    <p className="type-muted mt-1.5">{d.tables.length} tables · {cov}% of fields described{v.id === 'd2c' ? ` · ${inReview} change${inReview === 1 ? '' : 's'} in review` : ''}</p>
                  </div>
                ) : <p className="type-muted mt-4">Nothing here yet. Open it to import a YAML file.</p>}
                <p className="type-muted mt-4 border-t border-neutral-100 pt-3 dark:border-neutral-800">Owner {v.owner} · Updated {v.updated}</p>
              </Link>
            </motion.div>
          )
        })}
      </div>
    </>
  )
}
