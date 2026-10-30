// Minimal YAML writer (strings are JSON-quoted, which is valid YAML). Exports the whole semantic view in one file.
// Restricted fields are listed by name only, flagged `restricted: true`; there are no values anywhere in the prototype.
import type { SemanticView } from './semantic'
import type { Metric } from './mock'
import { englishOf, formulaOf } from './mock'
import type { ViewContext } from './context'

const q = (s: string) => JSON.stringify(s)
const list = (a: string[]) => `[${a.map(q).join(', ')}]`
const block = (k: string, a: string[], pad = '') => (a.length ? [`${pad}${k}:`, ...a] : [`${pad}${k}: []`])

export function viewToYaml(v: SemanticView, metrics: Metric[], ctx: ViewContext): string {
  const o: string[] = [
    '# Semantix semantic view export (prototype data). Changes still in review are not included.',
    `name: ${q(v.name)}`, `description: ${q(v.description)}`, `exported_at: ${q(new Date().toISOString().slice(0, 10))}`,
    ...block('can_answer', v.answers.map((a) => `  - ${q(a)}`)), ...block('cannot_answer', v.doesNotAnswer.map((a) => `  - ${q(a)}`)),
  ]
  o.push('', '# Context: what the business does, in everyday words, plus the glossary')
  o.push(...block('context', ctx.sections.flatMap((s) => [`  - title: ${q(s.title)}`, `    text: ${q(s.body)}`])))
  o.push(...block('glossary', ctx.glossary.flatMap((g) => [`  - term: ${q(g.term)}`, `    meaning: ${q(g.meaning)}`])))

  o.push('', '# Tables and every field with its description')
  o.push(...block('tables', v.tables.flatMap((t) => [
    `  - name: ${q(t.id)}`, `    label: ${q(t.label)}`, `    group: ${q(t.group)}`, `    type: ${t.role === 'fact' ? 'records_of_activity' : 'reference_list'}`,
    `    source: ${q(t.source)}`, `    description: ${q(t.description)}`,
    ...block('fields', t.fields.flatMap((f) => [
      `      - name: ${q(f.name)}`, `        kind: ${f.kind}`, `        type: ${q(f.type)}`,
      ...(f.description ? [`        description: ${q(f.description)}`] : ['        description: null']),
      ...(f.synonyms?.length ? [`        synonyms: ${list(f.synonyms)}`] : []),
      ...(f.restricted ? ['        restricted: true'] : []),
    ]), '    '),
  ])))

  o.push('', '# Relationships between tables')
  o.push(...block('relationships', v.joins.flatMap((j) => [`  - from: ${q(j.from)}`, `    to: ${q(j.to)}`, `    on: ${q(j.on)}`])))

  o.push('', '# Metrics (the approved KPIs)')
  o.push(...block('metrics', metrics.flatMap((m) => [
    `  - name: ${q(m.name)}`, `    title: ${q(m.title)}`, `    category: ${q(m.category)}`, `    description: ${q(m.description)}`, `    table: ${q(m.table)}`,
    ...(m.imported ? [`    expression: ${q(m.expression ?? '')}`] : [`    in_words: ${q(englishOf(m.def))}`, `    formula: ${q(formulaOf(m.def))}`,
      `    definition: { action: ${m.def.action}, column: ${q(m.def.column)}, per: ${m.def.per ? q(m.def.per) : 'null'} }`]),
    ...(m.synonyms?.length ? [`    synonyms: ${list(m.synonyms)}`] : []), ...(m.useWhen ? [`    use_when: ${q(m.useWhen)}`] : []),
    `    builds_on: ${list(m.buildsOn)}`, `    feeds: ${list(m.feeds)}`, `    last_updated: ${q(m.updated)}`,
  ])))

  o.push('', '# Ready-made filters')
  o.push(...block('filters', v.filters.flatMap((f) => [`  - name: ${q(f.label)}`, `    group: ${q(f.group)}`, `    table: ${q(f.table)}`, `    meaning: ${q(f.meaning)}`, ...(f.synonyms.length ? [`    synonyms: ${list(f.synonyms)}`] : [])])))

  o.push('', '# Rules every answer follows')
  o.push(...block('rules', v.rules.flatMap((r) => [`  - title: ${q(r.title)}`, `    topic: ${q(r.topic)}`, `    body: ${q(r.body)}`])))

  o.push('', '# Verified queries')
  o.push(...block('verified_queries', v.questions.flatMap((x) => [`  - question: ${q(x.text)}`, `    topic: ${q(x.topic)}`, `    verified_by: ${q(x.by)}`, `    verified_at: ${q(x.at)}`, `    sql: ${q(x.sql)}`])))
  return o.join('\n') + '\n'
}
