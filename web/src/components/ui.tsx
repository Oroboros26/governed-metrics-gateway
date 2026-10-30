import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Icon } from './Icon'
import type { Change } from '../lib/mock'

export const Skeleton = ({ className = '' }: { className?: string }) => (
  <div className={`animate-pulse rounded-lg bg-neutral-200 dark:bg-neutral-800 ${className}`} />
)

export function PageHeader({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="type-page-title">{title}</h1>
        {sub && <p className="type-page-sub">{sub}</p>}
      </div>
      {action}
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="card flex items-start gap-3 border-red-200 dark:border-red-500/30">
      <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
      <div className="flex-1">
        <p className="type-section-title">Something went wrong</p>
        <p className="type-muted mt-0.5">{message}</p>
      </div>
      {onRetry && <button className="btn btn-outline" onClick={onRetry}>Try again</button>}
    </div>
  )
}

export const EmptyState = ({ title, hint, action }: { title: string; hint: string; action?: ReactNode }) => (
  <div className="card py-12 text-center">
    <p className="type-section-title">{title}</p>
    <p className="type-muted mx-auto mt-1 max-w-sm">{hint}</p>
    {action && <div className="mt-4">{action}</div>}
  </div>
)

export const Banner = ({ kind, children }: { kind: 'error' | 'warn' | 'success' | 'info'; children: ReactNode }) => {
  const c = {
    error: 'border-red-200 bg-red-50 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300',
    warn: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300',
    info: 'border-neutral-200 bg-neutral-50 text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300',
  }[kind]
  return (
    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} role={kind === 'error' ? 'alert' : 'status'}
      className={`flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm ${c}`}>
      <Icon name={kind === 'success' ? 'check' : 'alert'} className="mt-0.5 h-4 w-4 shrink-0" />
      <div>{children}</div>
    </motion.div>
  )
}

export const StatusBadge = ({ c }: { c: Change }) =>
  c.stage === 'live' ? <span className="badge badge-success">Live</span>
  : c.stage === 'sent_back' ? <span className="badge badge-error">Sent back</span>
  : c.stage === 'mr_open' ? <span className="badge badge-info">Merge request open</span>
  : <span className="badge badge-warn">With the analyst</span>

/** Shows text + marker for every stage, so meaning never relies on color alone. Changes that need no merge request skip that stage. */
export function Timeline({ c }: { c: Change }) {
  const stages = c.tier === 'engineering' ? ['Submitted', 'Analyst review', 'Merge request', 'Live'] : ['Submitted', 'Analyst review', 'Live']
  const idx = c.stage === 'live' ? stages.length : c.stage === 'mr_open' ? 2 : 1 // first stage that is not done
  const failedAt = c.stage === 'sent_back' ? (c.reason?.startsWith('Engineering') ? 2 : 1) : -1
  const last = c.events[c.events.length - 1]
  return (
    <>
      <ol className={`mt-4 grid grid-cols-2 gap-3 ${stages.length === 4 ? 'sm:grid-cols-4' : 'sm:grid-cols-3'}`}>
        {stages.map((s, i) => {
          const done = i < idx && failedAt < 0 || (failedAt >= 0 && i < failedAt)
          const bad = i === failedAt
          const current = !done && !bad && i === idx && failedAt < 0
          const bar = bad ? 'bg-red-500' : done ? 'bg-emerald-500' : current ? 'bg-accent-500' : 'bg-neutral-200 dark:bg-neutral-800'
          return (
            <li key={s}>
              <div className={`h-1 rounded-full ${bar}`} />
              <p className={`mt-1.5 text-xs ${done || current || bad ? 'font-medium' : 'text-neutral-400 dark:text-neutral-600'}`}>{bad ? `${s}: sent back` : s}</p>
              <p className="type-muted">{bad ? 'Needs changes' : done ? 'Done' : current ? 'Current step' : 'Waiting'}</p>
            </li>
          )
        })}
      </ol>
      {last && <p className="type-muted mt-2">{last.when} · {last.text}{c.tier === 'analyst' && c.stage !== 'live' && c.stage !== 'sent_back' ? ' · no merge request needed' : ''}</p>}
    </>
  )
}
