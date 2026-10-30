// Rough "mentioned in" matching by word overlap. Sample logic only, no AI.
import type { SemanticView } from './semantic'
import type { Metric } from './mock'

const STOP = new Set('a an the of for in on at by to and or is are was what how much many show me our we my with from last this that per all'.split(' '))
const words = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length > 1 && !STOP.has(w)).map((w) => w.replace(/(ies)$/, 'y').replace(/s$/, ''))

/** Metrics, verified queries and rules that talk about a metric (a rough "mentioned in", based on its name and synonyms). */
export function mentionedIn(m: Metric, view: SemanticView) {
  const keys = words(`${m.title} ${(m.synonyms ?? []).join(' ')}`).filter((w) => w.length > 3)
  const hit = (t: string) => keys.some((k) => words(t).includes(k))
  return { queries: view.questions.filter((x) => hit(x.text)), rules: view.rules.filter((r) => hit(`${r.title} ${r.body}`)) }
}
