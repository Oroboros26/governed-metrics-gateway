import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { publishView, submitViewForReview } from '../lib/workflow'
import { useRole } from '../lib/role'
import { Banner } from './ui'
import { Icon } from './Icon'
import NewFolder from './NewFolder'

const STEPS_ENG = ['Semantix creates a branch', 'It adds the new folder with all the files in one commit', 'It opens a merge request on main', 'An engineer reviews the code and merges it']

/** Side panel: what happens when a view is submitted. The action depends on the role. */
export function PublishPanel({ viewId, name, summary, onClose }: { viewId: string; name: string; summary: string; onClose: () => void }) {
  const { role } = useRole()
  const qc = useQueryClient()
  const [note, setNote] = useState('')
  const done = () => { qc.invalidateQueries({ queryKey: ['changes'] }); qc.invalidateQueries({ queryKey: ['mrs'] }) }
  const review = useMutation({ mutationFn: () => submitViewForReview(viewId, name, summary, note.trim()), onSuccess: done })
  const publish = useMutation({ mutationFn: () => publishView(viewId, name), onSuccess: done })
  const biz = role === 'business'
  const m = biz ? review : publish
  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-30 bg-black/30" onClick={onClose} />
      <motion.aside role="dialog" aria-label={biz ? 'Submit for review' : 'Publish to the repository'} initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 40, opacity: 0 }} transition={{ duration: 0.18 }}
        className="fixed inset-y-0 right-0 z-40 w-full max-w-lg overflow-y-auto border-l border-neutral-200 bg-white p-6 shadow-xl dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-start justify-between"><h2 className="text-lg font-semibold tracking-tight">{biz ? `Submit ${name} for review` : role === 'analyst' ? `Send ${name} to engineering` : `Publish ${name} to the repository`}</h2><button className="btn btn-ghost !px-1.5" onClick={onClose} aria-label="Close"><Icon name="x" /></button></div>
        {m.isSuccess ? (
          <div className="mt-5 space-y-3">
            <Banner kind="success">{biz ? 'Sent to your data analyst. They will check it and send it on to engineering.' : <>Merge request <b>{publish.data}</b> is open. Nothing is in the repository until it is merged.</>}</Banner>
            <div className="flex gap-2">{biz ? <Link to="/app/changes" className="btn btn-primary">Follow it in My Changes</Link> : <Link to={`/app/mrs/${publish.data}`} className="btn btn-primary">Open {publish.data}</Link>}<button className="btn btn-ghost" onClick={onClose}>Close</button></div>
          </div>
        ) : (
          <>
            <p className="type-muted mt-2">{summary}</p>
            <h3 className="type-label-caps mt-5">The folder that will be created</h3>
            <div className="mt-2"><NewFolder viewId={viewId} /></div>
            {biz ? (
              <>
                <label className="label mt-4" htmlFor="pn">Note for your analyst (optional)</label>
                <input id="pn" className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="What is this view for?" />
              </>
            ) : (
              <>
                <h3 className="type-label-caps mt-5">What happens</h3>
                <ol className="mt-2 space-y-1.5">{STEPS_ENG.map((s, i) => <li key={s} className="flex gap-2 text-sm"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-50 text-[11px] font-semibold text-accent-700 dark:bg-accent-500/15 dark:text-accent-300">{i + 1}</span>{s}</li>)}</ol>
                <fieldset className="mt-4"><legend className="label">Where it goes</legend>
                  <label className="flex items-start gap-2 text-sm"><input type="radio" checked readOnly className="mt-1" /><span>Open a merge request <span className="type-muted block">Repository <span className="type-mono">semantix/semantic-views</span>, branch <span className="type-mono">semantix/new-view-{viewId}</span> into <span className="type-mono">main</span></span></span></label>
                  <label className="mt-2 flex items-start gap-2 text-sm opacity-50"><input type="radio" disabled className="mt-1" /><span>Commit straight to main <span className="type-muted block">Not allowed: main only accepts merge requests</span></span></label>
                </fieldset>
                <p className="type-muted mt-3">Prototype: nothing is sent to GitLab.</p>
              </>
            )}
            <div className="mt-5 flex gap-2"><button className="btn btn-primary" disabled={m.isPending} onClick={() => m.mutate()}>{m.isPending ? 'Sending…' : biz ? 'Submit for review' : 'Create merge request'}</button><button className="btn btn-ghost" onClick={onClose}>Cancel</button></div>
          </>
        )}
      </motion.aside>
    </>
  )
}

export const publishOpen = (s: boolean, el: React.ReactNode) => <AnimatePresence>{s && el}</AnimatePresence>
