import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { listCommits, publishedViews } from '../../lib/workflow'
import { viewFolders } from '../../lib/repoFiles'
import { Banner, PageHeader, Skeleton } from '../../components/ui'
import { Icon } from '../../components/Icon'

const TREE = ['views/', '  d2c/', '    view.yaml', '    relationships.yaml', '    tables/', '    metrics/', '    filters/', '    rules/', '    verified_queries/', '    context/', '  finance/', '  wholesale/', 'access/', '  people.yaml', '.gitlab-ci.yml', 'CODEOWNERS']
export default function Repository() {
  const pub = publishedViews()
  const tree = TREE
  const { data, isLoading } = useQuery({ queryKey: ['commits'], queryFn: listCommits })
  return (
    <>
      <PageHeader title="Repository" sub="Every approved change ends up here as a commit, so the files in git are the record of the semantic layer." />
      <div className="mb-4"><Banner kind="info">Prototype: a sample repository <span className="type-mono">semantix/semantic-views</span>. The branch <span className="type-mono">main</span> only accepts merge requests.</Banner></div>
      <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
        <section className="card"><h2 className="type-section-title flex items-center gap-1.5"><Icon name="changes" className="h-4 w-4" /> Files</h2><pre className="type-mono mt-3 leading-6">{tree.join('\n')}</pre>{pub.length > 0 && <div className="mt-3 space-y-1">{pub.map((p) => <p key={p.viewId} className="type-mono rounded bg-emerald-50 px-2 py-1 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300">+ views/{p.viewId}/ ({viewFolders(p.viewId).reduce((a, f) => a + f.files.length, 0)} files, {p.mr})</p>)}</div>}<p className="type-muted mt-2">One small file per metric, filter or rule, so changes rarely clash.</p></section>
        <section className="card">
          <h2 className="type-section-title">Recent commits on main</h2>
          {isLoading && <Skeleton className="mt-3 h-40" />}
          <ul className="mt-2 divide-y divide-neutral-100 dark:divide-neutral-800">
            {data?.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div><p className="text-sm font-medium">{c.msg}</p><p className="type-muted">{c.by} · {c.when}</p></div>
                <span className="flex items-center gap-2">{c.mr && <Link to={`/app/mrs/${c.mr}`} className="badge badge-neutral hover:underline">{c.mr}</Link>}<span className="type-mono">{c.id}</span></span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  )
}
