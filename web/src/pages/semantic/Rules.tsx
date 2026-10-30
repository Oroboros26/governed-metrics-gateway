import { useState } from 'react'
import { useRole } from '../../lib/role'
import { AnimatePresence } from 'framer-motion'
import type { Rule, SemanticView } from '../../lib/semantic'
import ChangePanel, { CardActions, type PanelMode } from '../../components/ChangePanel'
import { Icon } from '../../components/Icon'

export default function Rules({ view }: { view: SemanticView }) {
  const { canEdit } = useRole()
  const topics = ['All', ...new Set(view.rules.map((r) => r.topic))]
  const [topic, setTopic] = useState('All')
  const [panel, setPanel] = useState<{ mode: PanelMode; item?: Rule } | null>(null)
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="type-muted max-w-2xl text-sm">How we calculate things, in plain language. These are the rules every answer follows.</p>
        {canEdit && <button className="btn btn-primary" onClick={() => setPanel({ mode: 'add' })}><Icon name="plus" /> Add rule</button>}
      </div>
      <div role="group" aria-label="Topic" className="mb-4 flex flex-wrap gap-1.5">
        {topics.map((t) => (
          <button key={t} aria-pressed={topic === t} onClick={() => setTopic(t)}
            className={`rounded-full border px-3 py-1 text-xs font-medium ${topic === t ? 'border-accent-500 bg-accent-50 text-accent-700 dark:bg-accent-500/10 dark:text-accent-300' : 'border-neutral-200 text-neutral-600 dark:border-neutral-800 dark:text-neutral-400'}`}>{t}</button>
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
        {view.rules.filter((r) => topic === 'All' || r.topic === topic).map((r) => (
          <article key={r.id} className="card">
            <span className="badge badge-accent">{r.topic}</span>
            <h3 className="type-section-title mt-2">{r.title}</h3>
            <p className="mt-1.5 text-sm text-neutral-700 dark:text-neutral-300">{r.body}</p>
            {canEdit && <CardActions name={r.title} onEdit={() => setPanel({ mode: 'edit', item: r })} onRemove={() => setPanel({ mode: 'remove', item: r })} />}
          </article>
        ))}
      </div>
      <AnimatePresence>
        {panel && (
          <ChangePanel key={`${panel.mode}-${panel.item?.id ?? 'new'}`} noun="rule" mode={panel.mode} nameKey="title" existing={view.rules.map((r) => r.title)} onClose={() => setPanel(null)}
            initial={panel.item ? { title: panel.item.title, topic: panel.item.topic, body: panel.item.body } : {}}
            fields={[
              { key: 'title', label: 'Title', kind: 'text', required: true },
              { key: 'topic', label: 'Topic', kind: 'select', options: [...new Set(view.rules.map((r) => r.topic))] },
              { key: 'body', label: 'The rule, in everyday words', kind: 'area', required: true },
            ]} />
        )}
      </AnimatePresence>
    </div>
  )
}
