import { useState } from 'react'
import { viewFolders } from '../lib/repoFiles'
import { Icon } from './Icon'

/** The new folder a view creates in the repository, as a tree. Folders open on click, so it stays short. */
export default function NewFolder({ viewId }: { viewId: string }) {
  const folders = viewFolders(viewId)
  const [open, setOpen] = useState<string | null>(null)
  const total = folders.reduce((a, f) => a + f.files.length, 0)
  return (
    <div className="overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800">
      <p className="type-mono flex items-center justify-between border-b border-neutral-200 bg-emerald-50 px-3 py-1.5 text-emerald-800 dark:border-neutral-800 dark:bg-emerald-500/10 dark:text-emerald-300"><span>+ views/{viewId}/</span><span>{total} new files</span></p>
      <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
        {folders.map((f) => {
          const k = f.folder || '(root)'
          return (
            <li key={k}>
              <button className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-neutral-50 dark:hover:bg-neutral-900" aria-expanded={open === k} onClick={() => setOpen(open === k ? null : k)}>
                <Icon name="chevron" className={`h-3 w-3 transition-transform ${open === k ? '' : '-rotate-90'}`} />
                <span className="type-mono flex-1">{f.folder ? `${f.folder}/` : 'view files'}</span><span className="type-muted">{f.files.length} file{f.files.length > 1 ? 's' : ''}</span>
              </button>
              {open === k && <ul className="type-mono max-h-40 overflow-y-auto bg-neutral-50 px-3 py-1.5 pl-9 dark:bg-neutral-900/50">{f.files.map((x) => <li key={x} className="text-emerald-700 dark:text-emerald-300">+ {x}</li>)}</ul>}
            </li>
          )
        })}
        {folders.length === 0 && <li className="type-muted px-3 py-2">This view has no content yet.</li>}
      </ul>
    </div>
  )
}
