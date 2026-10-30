import { diffOf, type Change } from '../lib/workflow'

/** Small code-style diff of one change (illustrative). */
export default function Diff({ c }: { c: Change }) {
  const d = diffOf(c)
  return (
    <div className="overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800">
      <p className="type-mono border-b border-neutral-200 bg-neutral-50 px-3 py-1.5 dark:border-neutral-800 dark:bg-neutral-900">{d.path}</p>
      <pre className="type-mono overflow-x-auto py-1" aria-label={`Changes in ${d.path}`}>
        {d.lines.map((l, i) => (
          <div key={i} className={`px-3 ${l.t === 'add' ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300' : l.t === 'del' ? 'bg-red-50 text-red-800 dark:bg-red-500/10 dark:text-red-300' : 'text-neutral-600 dark:text-neutral-400'}`}>
            <span aria-hidden className="mr-2 select-none">{l.t === 'add' ? '+' : l.t === 'del' ? '-' : ' '}</span><span className="sr-only">{l.t === 'add' ? 'added: ' : l.t === 'del' ? 'removed: ' : ''}</span>{l.s}
          </div>
        ))}
      </pre>
    </div>
  )
}
