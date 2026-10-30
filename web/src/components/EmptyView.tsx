import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { saveStored } from '../lib/store'
import { useQueryClient } from '@tanstack/react-query'
import type { ViewInfo } from '../lib/views'
import ImportDialog from './ImportDialog'
import { Icon } from './Icon'
import { useRole } from '../lib/role'

/** Shown on every page of a view that has no content yet. */
export default function EmptyView({ view }: { view: ViewInfo }) {
  const [open, setOpen] = useState(false)
  const qc = useQueryClient()
  const { role } = useRole()
  const scratch = () => {
    saveStored(view.id, { semantic: { name: view.name, description: view.description, answers: [], doesNotAnswer: [], tables: [], filters: [], rules: [], questions: [], joins: [] }, metrics: [], context: { sections: [], glossary: [] }, importedAt: new Date().toISOString(), source: 'started from scratch' })
    qc.invalidateQueries()
  }
  return (
    <div className="card py-12 text-center">
      <p className="type-section-title">{view.name} is empty</p>
      <p className="type-muted mx-auto mt-1 max-w-md">Import a YAML file to fill this view with tables, metrics, filters, rules, verified queries and context, or start with an empty view and add things yourself.</p>
      {<div className="mt-5 flex flex-wrap justify-center gap-2">
        <button className="btn btn-primary" onClick={() => setOpen(true)}><Icon name="plus" /> Import a YAML file</button>
        <button className="btn btn-outline" onClick={scratch}>Start from scratch</button>
      </div>}
      <AnimatePresence>{open && <ImportDialog viewId={view.id} viewName={view.name} replacing={false} onClose={() => setOpen(false)} />}</AnimatePresence>
    </div>
  )
}
