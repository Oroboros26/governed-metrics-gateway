import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { PERSONAS, useRole, type Role } from '../lib/role'
import { Icon } from './Icon'

const STEPS: { who: Role; text: string; to: string }[] = [
  { who: 'business', text: 'Ask for something: add a filter, a rule or a verified query, or edit a metric. It is sent for review.', to: '/app/v/d2c/filters' },
  { who: 'analyst', text: 'Open the Review queue. Run the 7-day test, select several changes and create one merge request.', to: '/app/review' },
  { who: 'engineer', text: 'Open the merge request, read the code changes and the checks, then approve and merge.', to: '/app/mrs' },
  { who: 'business', text: 'Back in My Changes, the request shows as Live, with its full timeline.', to: '/app/changes' },
  { who: 'engineer', text: 'The Repository shows the commit. MCP controls what each agent sees, and People and access shows who works with which view.', to: '/app/repo' },
]

/** A small checklist for showing the story to someone else. Each step switches to the right person. */
export default function DemoGuide() {
  const [open, setOpen] = useState(false)
  const { role, setRole } = useRole()
  const nav = useNavigate()
  return (
    <div className="fixed bottom-4 right-4 z-20">
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} transition={{ duration: 0.12 }}
            className="mb-2 w-[min(360px,calc(100vw-2rem))] rounded-xl border border-neutral-200 bg-white p-4 shadow-xl dark:border-neutral-700 dark:bg-neutral-900" role="region" aria-label="Demo guide">
            <p className="type-section-title">The story in five steps</p>
            <ol className="mt-3 space-y-3">
              {STEPS.map((s, i) => (
                <li key={i} className="flex gap-2.5 text-sm">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-50 text-[11px] font-semibold text-accent-700 dark:bg-accent-500/15 dark:text-accent-300">{i + 1}</span>
                  <span className="min-w-0 flex-1"><span className="block">{s.text}</span>
                    <button className="mt-1 text-xs font-medium text-accent-600 hover:underline dark:text-accent-300" onClick={() => { setRole(s.who); nav(s.to) }}>{role === s.who ? 'Go there' : `Switch to ${PERSONAS[s.who].name} and go`}</button></span>
                </li>
              ))}
            </ol>
          </motion.div>
        )}
      </AnimatePresence>
      <button className="btn btn-outline ml-auto bg-white shadow-md dark:bg-neutral-900" aria-expanded={open} onClick={() => setOpen((o) => !o)}><Icon name="help" /> Demo guide</button>
    </div>
  )
}
