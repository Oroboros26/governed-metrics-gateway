import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { listMetrics, englishOf } from '../../lib/mock'
import { EmptyState, ErrorState, Skeleton } from '../../components/ui'
import { Icon } from '../../components/Icon'
import { path } from '../../lib/views'
import { useRole } from '../../lib/role'

export default function MetricsTab({ view }: { view: string }) {
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: ['metrics', view], queryFn: () => listMetrics(view) })
  const { canEdit } = useRole()
  const cats = [...new Set((data ?? []).map((m) => m.category))]
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="type-muted max-w-2xl text-sm">{view === 'd2c' ? 'The approved KPIs. Open one to see how it works, or add your own.' : 'The metrics defined in the imported file.'}</p>
        {view === 'd2c' && canEdit && <Link to={path.newMetric(view)} className="btn btn-primary"><Icon name="plus" /> Add metric</Link>}
      </div>
      {isLoading && <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-40" />)}</div>}
      {isError && <ErrorState message={(error as Error).message} onRetry={() => refetch()} />}
      {data && data.length === 0 && <EmptyState title="No metrics yet" hint={view === 'd2c' ? 'Add the first one.' : 'The imported file did not define any metrics.'} />}
      {cats.map((c) => (
        <section key={c} className="mb-8">
          <h2 className="type-label-caps mb-3">{c}</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {data!.filter((m) => m.category === c).map((m, i) => (
              <motion.div key={m.name} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Link to={path.metric(view, m.name)} className="card block h-full transition-colors hover:border-accent-500/60">
                  <div className="flex items-start justify-between gap-2"><h3 className="type-section-title">{m.title}</h3>{m.imported ? <span className="badge badge-neutral">Imported</span> : <span className="badge badge-success">Live</span>}</div>
                  <p className="type-muted mt-1.5">{m.description}</p>
                  <p className={`mt-3 text-xs text-neutral-700 dark:text-neutral-300 ${m.imported ? 'type-mono line-clamp-3' : ''}`}>{m.imported ? m.expression ?? 'No expression in the file' : englishOf(m.def)}</p>
                  {m.useWhen && <p className="type-muted mt-2">Use when: {m.useWhen}</p>}
                  {m.synonyms && <p className="type-muted mt-1">Also called: {m.synonyms.join(', ')}</p>}
                  <div className="type-muted mt-4 flex items-center justify-between border-t border-neutral-100 pt-3 dark:border-neutral-800">
                    <span className="type-mono">{m.table}</span>{!m.imported && <span>Builds on {m.buildsOn.length} · Feeds {m.feeds.length}</span>}
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
