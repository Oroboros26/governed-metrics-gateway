import { useState } from 'react'
import { useRole } from '../../lib/role'
import { AnimatePresence } from 'framer-motion'
import type { SemFilter, SemanticView } from '../../lib/semantic'
import ChangePanel, { CardActions, type PanelMode } from '../../components/ChangePanel'
import { Icon } from '../../components/Icon'

export default function Filters({ view, go }: { view: SemanticView; go: (p: Record<string, string>) => void }) {
  const { canEdit } = useRole()
  const groups = [...new Set(view.filters.map((f) => f.group))]
  const table = (id: string) => view.tables.find((t) => t.id === id)?.label ?? id
  const [panel, setPanel] = useState<{ mode: PanelMode; item?: SemFilter } | null>(null)
  const GROUPS = ['Region', 'Channel', 'Segment', 'Period', 'Other']
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="type-muted max-w-2xl text-sm">Ready-made filters. Use the same ones everywhere so two reports mean the same thing by "D2C" or "EMEA".</p>
        {canEdit && <button className="btn btn-primary" onClick={() => setPanel({ mode: 'add' })}><Icon name="plus" /> Add filter</button>}
      </div>
      {groups.map((g) => (
        <section key={g} className="mb-6">
          <h2 className="type-label-caps mb-2">{g}</h2>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {view.filters.filter((f) => f.group === g).map((f) => (
              <article key={f.id} className="card">
                <h3 className="type-section-title">{f.label}</h3>
                <p className="mt-1.5 text-sm text-neutral-700 dark:text-neutral-300">{f.meaning}</p>
                <div className="type-muted mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-neutral-100 pt-3 dark:border-neutral-800">
                  <button className="text-accent-600 hover:underline dark:text-accent-300" onClick={() => go({ tab: 'tables', table: f.table })}>Applies to {table(f.table)}</button>
                  {f.synonyms.length > 0 && <span>Also: {f.synonyms.join(', ')}</span>}
                </div>
                {canEdit && <CardActions name={f.label} onEdit={() => setPanel({ mode: 'edit', item: f })} onRemove={() => setPanel({ mode: 'remove', item: f })} />}
              </article>
            ))}
          </div>
        </section>
      ))}
      <AnimatePresence>
        {panel && (
          <ChangePanel key={`${panel.mode}-${panel.item?.id ?? 'new'}`} noun="filter" mode={panel.mode} nameKey="label" existing={view.filters.map((f) => f.label)} onClose={() => setPanel(null)}
            initial={panel.item ? { label: panel.item.label, group: panel.item.group, meaning: panel.item.meaning, table: table(panel.item.table), synonyms: panel.item.synonyms.join(', ') } : {}}
            fields={[
              { key: 'label', label: 'Name', kind: 'text', required: true, hint: 'For example "EMEA" or "Last 30 days".' },
              { key: 'group', label: 'Group', kind: 'select', options: GROUPS },
              { key: 'meaning', label: 'What it means, in plain words', kind: 'area', required: true },
              { key: 'table', label: 'Applies to', kind: 'select', options: view.tables.map((t) => t.label) },
              { key: 'synonyms', label: 'Also known as (separate with commas)', kind: 'text' },
            ]} />
        )}
      </AnimatePresence>
    </div>
  )
}
