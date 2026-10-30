import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getSemanticView } from '../lib/semantic'
import { findView, hasData, path, type SectionId } from '../lib/views'
import { useStoreVersion } from '../lib/store'
import EmptyView from '../components/EmptyView'
import { ErrorState, PageHeader, Skeleton } from '../components/ui'
import Overview from './semantic/Overview'
import Tables from './semantic/Tables'
import MetricsTab from './semantic/MetricsTab'
import Filters from './semantic/Filters'
import Rules from './semantic/Rules'
import Questions from './semantic/Questions'
import Context from './semantic/Context'

const META: Record<SectionId, { title: string; sub: string }> = {
  overview: { title: 'Overview', sub: 'What this view covers and how its data fits together.' },
  tables: { title: 'Tables', sub: 'Every table and field, in plain language.' },
  metrics: { title: 'Metrics', sub: 'The approved KPIs. Open one to see how it works, or add your own.' },
  filters: { title: 'Filters', sub: 'Ready-made filters, so everyone means the same thing by "D2C" or "EMEA".' },
  rules: { title: 'Rules', sub: 'How we calculate things, in plain language.' },
  queries: { title: 'Verified queries', sub: 'Questions the data team has answered and checked, with the approved query behind each.' },
  context: { title: 'Business context', sub: 'Explain the business in everyday words, so everyone reads the same text.' },
}

export default function SectionPage({ section }: { section: SectionId }) {
  const { view: viewId } = useParams()
  const view = findView(viewId)
  const [sp] = useSearchParams()
  const nav = useNavigate()
  useStoreVersion()
  const live = !!view && hasData(view.id)
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: ['semantic', viewId], queryFn: () => getSemanticView(viewId), enabled: live })
  if (!view) return <ErrorState message="We could not find that semantic view." />
  const m = META[section]
  const go = (p: Record<string, string>) => { const { tab, ...rest } = p; nav(path.section(view.id, tab ?? section, rest)) }

  return (
    <>
      <PageHeader title={m.title} sub={live ? m.sub : undefined} />
      {!live && <EmptyView view={view} />}
      {live && isLoading && <div className="space-y-4"><Skeleton className="h-40" /><Skeleton className="h-72" /></div>}
      {live && isError && <ErrorState message={(error as Error).message} onRetry={() => refetch()} />}
      {live && data && (
        <>
          {section === 'overview' && <Overview view={data} go={go} />}
          {section === 'tables' && <Tables view={data} tableId={sp.get('table') ?? undefined} fieldName={sp.get('field') ?? undefined} gaps={sp.get('gaps') === '1'} go={go} />}
          {section === 'metrics' && <MetricsTab view={view.id} />}
          {section === 'filters' && <Filters view={data} go={go} />}
          {section === 'rules' && <Rules view={data} />}
          {section === 'queries' && <Questions view={data} />}
          {section === 'context' && <Context view={view.id} />}
        </>
      )}
    </>
  )
}
