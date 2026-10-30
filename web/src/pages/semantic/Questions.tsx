import { useState } from 'react'
import { useRole } from '../../lib/role'
import { AnimatePresence } from 'framer-motion'
import type { Question, SemanticView } from '../../lib/semantic'
import ChangePanel, { CardActions, type PanelMode } from '../../components/ChangePanel'
import { Icon } from '../../components/Icon'

export default function Questions({ view }: { view: SemanticView }) {
  const { canEdit } = useRole()
  const topics = ['All', ...new Set(view.questions.map((q) => q.topic))]
  const [topic, setTopic] = useState('All')
  const [panel, setPanel] = useState<{ mode: PanelMode; item?: Question } | null>(null)
  const [shown, setShown] = useState<Record<string, boolean>>({})
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="type-muted max-w-2xl text-sm">Questions the data team has already answered, with the approved query behind each. Ask the same way and you get the same, approved answer.</p>
        {canEdit && <button className="btn btn-primary" onClick={() => setPanel({ mode: 'add' })}><Icon name="plus" /> Add verified query</button>}
      </div>
      <div role="group" aria-label="Topic" className="mb-4 flex flex-wrap gap-1.5">
        {topics.map((t) => (
          <button key={t} aria-pressed={topic === t} onClick={() => setTopic(t)}
            className={`rounded-full border px-3 py-1 text-xs font-medium ${topic === t ? 'border-accent-500 bg-accent-50 text-accent-700 dark:bg-accent-500/10 dark:text-accent-300' : 'border-neutral-200 text-neutral-600 dark:border-neutral-800 dark:text-neutral-400'}`}>{t}</button>
        ))}
      </div>
      <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
        {view.questions.filter((q) => topic === 'All' || q.topic === topic).map((q) => (
          <article key={q.id} className="card">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="badge badge-accent">{q.topic}</span>
              <span className="badge badge-success">Verified by {q.by} · {q.at}</span>
            </div>
            <h3 className="mt-2 text-base font-medium">{q.text}</h3>
            <button className="btn btn-ghost mt-2 !px-2" aria-expanded={!!shown[q.id]} onClick={() => setShown((s) => ({ ...s, [q.id]: !s[q.id] }))}>{shown[q.id] ? 'Hide SQL' : 'Show SQL'}</button>
            {shown[q.id] && <pre className="type-mono mt-2 overflow-x-auto rounded-lg bg-neutral-100 p-3 dark:bg-neutral-950">{q.sql}</pre>}
            {shown[q.id] && <p className="type-muted mt-1">Illustrative SQL in this prototype.</p>}
            {canEdit && <CardActions name={q.text} onEdit={() => setPanel({ mode: 'edit', item: q })} onRemove={() => setPanel({ mode: 'remove', item: q })} />}
          </article>
        ))}
      </div>
      <AnimatePresence>
        {panel && (
          <ChangePanel key={`${panel.mode}-${panel.item?.id ?? 'new'}`} noun="verified query" mode={panel.mode} nameKey="text" existing={view.questions.map((q) => q.text)} onClose={() => setPanel(null)}
            check={(v) => (/^\s*(select|with)\b/i.test(v.sql) ? undefined : 'The SQL must start with SELECT (or WITH). Verified queries only read data.')}
            initial={panel.item ? { text: panel.item.text, topic: panel.item.topic, sql: panel.item.sql } : {}}
            fields={[
              { key: 'text', label: 'The question, as a person would ask it', kind: 'text', required: true },
              { key: 'topic', label: 'Topic', kind: 'select', options: [...new Set(view.questions.map((q) => q.topic))] },
              { key: 'sql', label: 'The approved SQL', kind: 'code', required: true, hint: 'Checked only for SELECT in this prototype. In the product the 7-day test runs it.' },
            ]} />
        )}
      </AnimatePresence>
    </div>
  )
}
