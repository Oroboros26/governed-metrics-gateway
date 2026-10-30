import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getMR, listMRs, mergeMR, requestMRChanges, type MR } from '../../lib/workflow'
import { useRole } from '../../lib/role'
import { Banner, EmptyState, ErrorState, PageHeader, Skeleton } from '../../components/ui'
import { Icon } from '../../components/Icon'
import Diff from '../../components/Diff'
import NewFolder from '../../components/NewFolder'

const badge = (m: MR) => (m.status === 'open' ? <span className="badge badge-info">Open</span> : m.status === 'merged' ? <span className="badge badge-success">Merged</span> : <span className="badge badge-error">Sent back</span>)

export function MergeRequestList() {
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: ['mrs'], queryFn: listMRs })
  const [tab, setTab] = useState<MR['status']>('open')
  const rows = (data ?? []).filter((m) => m.status === tab)
  return (
    <>
      <PageHeader title="Merge requests" sub="What the data analysts have sent to engineering. Each one is a change to the semantic view files in the repository." />
      <div role="group" aria-label="Status" className="mb-4 flex gap-1.5">
        {([['open', 'Open'], ['merged', 'Merged'], ['closed', 'Sent back']] as const).map(([k, l]) => (
          <button key={k} aria-pressed={tab === k} onClick={() => setTab(k)} className={`rounded-full border px-3 py-1 text-xs font-medium ${tab === k ? 'border-accent-500 bg-accent-50 text-accent-700 dark:bg-accent-500/10 dark:text-accent-300' : 'border-neutral-200 text-neutral-600 dark:border-neutral-800 dark:text-neutral-400'}`}>{l} <span className="tabular-nums opacity-70">{data?.filter((m) => m.status === k).length ?? ''}</span></button>
        ))}
      </div>
      {isLoading && <Skeleton className="h-40" />}
      {isError && <ErrorState message={(error as Error).message} onRetry={() => refetch()} />}
      {data && rows.length === 0 && <EmptyState title="Nothing here" hint={tab === 'open' ? 'No merge requests are waiting for review.' : 'No merge requests in this list.'} />}
      <ul className="space-y-3">
        {rows.map((m) => (
          <li key={m.id}><Link to={`/app/mrs/${m.id}`} className="card flex flex-wrap items-center justify-between gap-2 !p-4 transition-colors hover:border-accent-500/60">
            <div><p className="text-sm font-medium"><span className="type-mono mr-2">{m.id}</span>{m.title}</p><p className="type-muted mt-0.5">Opened by {m.by} · {m.opened} · {m.changeIds.length} change{m.changeIds.length > 1 ? 's' : ''} · view {m.view.toUpperCase()}</p></div>
            {badge(m)}
          </Link></li>
        ))}
      </ul>
    </>
  )
}

export function MergeRequestPage() {
  const { id = '' } = useParams()
  const nav = useNavigate()
  const qc = useQueryClient()
  const { role } = useRole()
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: ['mr', id], queryFn: () => getMR(id) })
  const [ask, setAsk] = useState(false); const [why, setWhy] = useState(''); const [note, setNote] = useState(false)
  const done = () => { qc.invalidateQueries({ queryKey: ['mr'] }); qc.invalidateQueries({ queryKey: ['mrs'] }); qc.invalidateQueries({ queryKey: ['changes'] }); qc.invalidateQueries({ queryKey: ['commits'] }) }
  const merge = useMutation({ mutationFn: () => mergeMR(id), onSuccess: done })
  const back = useMutation({ mutationFn: () => requestMRChanges(id, why.trim()), onSuccess: () => { done(); setAsk(false) } })
  if (isLoading) return <div className="space-y-3"><Skeleton className="h-10 w-72" /><Skeleton className="h-48" /></div>
  if (isError || !data) return <ErrorState message={(error as Error)?.message ?? 'Not found.'} onRetry={() => refetch()} />
  const { mr, changes } = data
  return (
    <>
      <button className="btn btn-ghost mb-3 !px-2" onClick={() => nav('/app/mrs')}><Icon name="left" /> Merge requests</button>
      <PageHeader title={`${mr.id} · ${mr.title}`} sub={`Opened by ${mr.by} · ${mr.opened}`} action={<div className="flex items-center gap-2">{badge(mr)}<button className="btn btn-outline" onClick={() => setNote(true)}><Icon name="external" /> Open in GitLab</button></div>} />
      {note && <div className="mb-4"><Banner kind="info">Prototype: this would open the merge request in GitLab, where you sign in and review it as code.</Banner></div>}
      {mr.status === 'merged' && <div className="mb-4"><Banner kind="success">Merged by {mr.closedBy}. The changes are live and recorded in the repository. <Link to="/app/repo" className="underline">See the commit</Link></Banner></div>}
      {mr.status === 'closed' && <div className="mb-4"><Banner kind="error"><b>Sent back:</b> {mr.comment}</Banner></div>}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          {changes.map((c) => (
            <section key={c.id} className="card">
              <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="type-section-title">{c.title}</h2><span className="badge badge-neutral">{c.area}</span></div>
              <p className="type-muted mt-1">Asked by {c.by} · “{c.note}”</p>
              <div className="mt-3">{c.area === 'Semantic view' ? <><NewFolder viewId={c.view} /><Link to={`/app/v/${c.view}/overview`} className="btn btn-outline mt-2 !py-1 text-xs">Open the view</Link></> : <Diff c={c} />}</div>
            </section>
          ))}
        </div>
        <aside className="space-y-4">
          <section className="card">
            <h2 className="type-section-title">Checks</h2>
            <ul className="mt-2 space-y-1.5 text-sm">
              {['File structure is valid', 'No circular dependencies', 'SQL compiles for the warehouse'].map((t) => <li key={t} className="flex gap-2"><Icon name="check" className="mt-0.5 h-4 w-4 text-emerald-500" />{t}</li>)}
              <li className="flex gap-2"><Icon name="check" className="mt-0.5 h-4 w-4 text-emerald-500" />7-day test passed for {changes.length} change{changes.length > 1 ? 's' : ''}</li>
            </ul>
            <p className="type-muted mt-2">Sample checks in this prototype.</p>
          </section>
          {mr.status === 'open' && role === 'engineer' && (
            <section className="card">
              <h2 className="type-section-title">Your review</h2>
              {ask ? (
                <div className="mt-2"><label className="label" htmlFor="rq">What needs to change? *</label><textarea id="rq" rows={3} className="input" value={why} onChange={(e) => setWhy(e.target.value)} />
                  <div className="mt-2 flex gap-2"><button className="btn btn-primary" disabled={why.trim().length < 5 || back.isPending} onClick={() => back.mutate()}>{back.isPending ? 'Sending…' : 'Send back'}</button><button className="btn btn-ghost" onClick={() => setAsk(false)}>Cancel</button></div></div>
              ) : (
                <div className="mt-3 flex flex-col gap-2"><button className="btn btn-primary" disabled={merge.isPending} onClick={() => merge.mutate()}>{merge.isPending ? 'Merging…' : 'Approve and merge'}</button><button className="btn btn-outline" onClick={() => setAsk(true)}>Request changes</button></div>
              )}
            </section>
          )}
          {mr.status === 'open' && role !== 'engineer' && <Banner kind="info">Waiting for engineering to review.</Banner>}
        </aside>
      </div>
    </>
  )
}
