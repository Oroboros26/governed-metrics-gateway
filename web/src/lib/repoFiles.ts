// The files a semantic view becomes in the repository (names only, derived from the view's content).
import { SEMANTIC } from './semantic'
import { getStored } from './store'
import { slug } from './workflow'

export type Folder = { folder: string; files: string[] }
export function viewFolders(id: string): Folder[] {
  const st = id === 'd2c' ? null : getStored(id)
  const sem = id === 'd2c' ? SEMANTIC : st?.semantic
  if (!sem) return []
  const short = (t: string) => slug(t.split(/\s+/).slice(0, 6).join(' ')) || 'item'
  const uniq = (xs: string[]) => { const seen = new Map<string, number>(); return xs.map((x) => { const n = (seen.get(x) ?? 0) + 1; seen.set(x, n); return n > 1 ? `${x}_${n}` : x }) }
  const ctx = st?.context
  return [
    { folder: '', files: ['view.yaml', ...(sem.joins.length ? ['relationships.yaml'] : [])] },
    { folder: 'tables', files: uniq(sem.tables.map((t) => `${t.id}.yaml`)) },
    { folder: 'metrics', files: uniq((st?.metrics ?? []).map((m) => `${m.name}.yaml`)) },
    { folder: 'filters', files: uniq(sem.filters.map((f) => `${short(f.label)}.yaml`)) },
    { folder: 'rules', files: uniq(sem.rules.map((r) => `${short(r.title)}.yaml`)) },
    { folder: 'verified_queries', files: uniq(sem.questions.map((q) => `${short(q.text)}.yaml`)) },
    { folder: 'context', files: uniq([...(ctx?.sections ?? []).map((s) => `${short(s.title)}.yaml`), ...(ctx?.glossary.length ? ['glossary.yaml'] : [])]) },
  ].filter((f) => f.files.length > 0)
}
