import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { listChanges, listMRs, viewPublishStatus } from '../lib/workflow'
import { useRole } from '../lib/role'
import { PublishPanel } from './PublishPanel'
import { Icon } from './Icon'

/** Where an imported view stands on its way to the repository, with the next action for the current role. */
export default function PublishStrip({ viewId, name, summary }: { viewId: string; name: string; summary: string }) {
  useQuery({ queryKey: ['changes'], queryFn: listChanges }); useQuery({ queryKey: ['mrs'], queryFn: listMRs }) // refresh when the workflow changes
  const { role } = useRole()
  const [open, setOpen] = useState(false)
  const st = viewPublishStatus(viewId)
  const action = role === 'business' ? 'Submit for review' : role === 'analyst' ? 'Send to engineering' : 'Publish to repository'
  const can = st.state === 'draft' || st.state === 'sent_back' || (st.state === 'with_analyst' && role !== 'business')
  const tone = st.state === 'repo' ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10' : st.state === 'sent_back' ? 'border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10' : 'border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900'
  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 ${tone}`} role="status">
      <div className="flex min-w-0 items-start gap-2.5"><Icon name={st.state === 'repo' ? 'check' : 'merge'} className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="text-sm"><p className="font-medium">{{ draft: 'Draft, only in this browser', with_analyst: 'With the data analyst', mr_open: `Merge request ${st.mrId} is open`, repo: 'In the repository', sent_back: 'Sent back' }[st.state]}</p>
          <p className="type-muted">{{ draft: 'Nobody else can see this view yet. Send it on when it is ready.', with_analyst: 'Waiting for the analyst to check it and send it to engineering.', mr_open: 'Engineering is reviewing the code before it is merged.', repo: <>Saved as <span className="type-mono">views/{viewId}/</span> in the repository.</>, sent_back: st.reason ?? '' }[st.state]}</p></div></div>
      <div className="flex gap-2">
        {st.mrId && st.state === 'mr_open' && role !== 'business' && <Link to={`/app/mrs/${st.mrId}`} className="btn btn-outline">Open {st.mrId}</Link>}
        {st.state === 'repo' && role === 'engineer' && <Link to="/app/repo" className="btn btn-outline">See the folder</Link>}
        {can && <button className="btn btn-primary" onClick={() => setOpen(true)}>{st.state === 'sent_back' ? 'Resubmit' : action}</button>}
      </div>
      <AnimatePresence>{open && <PublishPanel viewId={viewId} name={name} summary={summary} onClose={() => setOpen(false)} />}</AnimatePresence>
    </div>
  )
}
