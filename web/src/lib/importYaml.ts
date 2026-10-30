// Reads a semantic view YAML in the browser and converts it to the shapes the prototype uses.
// Accepts the file this prototype exports ("Semantix") and a Snowflake-style semantic view.
// `sample_values` blocks are never copied: they are counted and dropped.
import { load } from 'js-yaml'
import type { Field, FieldKind, Join, Question, Rule, SemFilter, SemTable, SemanticView } from './semantic'
import type { Metric } from './mock'
import type { CtxSection, GlossaryItem, ViewContext } from './context'

type Obj = Record<string, unknown>
const isObj = (x: unknown): x is Obj => !!x && typeof x === 'object' && !Array.isArray(x)
const arr = (x: unknown): Obj[] => (Array.isArray(x) ? x.filter(isObj) : [])
const str = (x: unknown): string | undefined => (typeof x === 'string' ? x.trim() || undefined : typeof x === 'number' ? String(x) : undefined)
const strs = (x: unknown): string[] => (Array.isArray(x) ? (x.map(str).filter(Boolean) as string[]) : [])
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
const pretty = (s: string) => { const t = s.replace(/[_-]+/g, ' ').trim().toLowerCase(); return t ? t[0].toUpperCase() + t.slice(1) : s }
// Field names that look like they identify a private individual. A guess: always check the preview.
const RESTRICTED = /(account|address|street|zip|postal|phone|mobile|birth|e_?mail|first_?name|last_?name|surname|loyalty_?id|customer_?id|consumer_?id|passport)/i
const KINDS: FieldKind[] = ['slice', 'number', 'date', 'kpi']
const FILTER_GROUPS: SemFilter['group'][] = ['Region', 'Channel', 'Segment', 'Period', 'Other']
const countKey = (n: unknown, key: string): number => Array.isArray(n) ? n.reduce<number>((a, x) => a + countKey(x, key), 0) : isObj(n) ? Object.entries(n).reduce((a, [k, v]) => a + (k === key ? 1 : 0) + countKey(v, key), 0) : 0
const DEF = { action: 'sum', column: '', per: null } as const

export type ImportData = { semantic: SemanticView; metrics: Metric[]; context: ViewContext }
export type ImportResult =
  | { ok: true; format: 'Semantix' | 'Snowflake'; data: ImportData; counts: [string, number][]; warnings: string[] }
  | { ok: false; error: string }

export function parseSemanticYaml(text: string): ImportResult {
  let doc: unknown
  try { doc = load(text) } catch (e) { return { ok: false, error: `This is not valid YAML: ${(e as Error).message.split('\n')[0]}` } }
  if (!isObj(doc) || arr(doc.tables).length === 0) return { ok: false, error: 'No "tables" found. This does not look like a semantic view file.' }

  const warnings: string[] = []
  const dropped = countKey(doc, 'sample_values')
  if (dropped) warnings.push(`${dropped} "sample_values" block${dropped > 1 ? 's were' : ' was'} ignored. No sample values are kept or shown.`)

  const tables: SemTable[] = [], metrics: Metric[] = [], filters: SemFilter[] = []
  const ids = new Map<string, string>() // slug(name) -> unique id
  let format: 'Semantix' | 'Snowflake' = 'Snowflake'
  const addMetric = (m: Obj, table: string, category: string) => {
    const name = str(m.name); if (!name) return
    metrics.push({
      name: slug(name), title: str(m.title) ?? pretty(name), category: str(m.category) ?? category, description: str(m.description) ?? '', table,
      def: { ...DEF }, buildsOn: strs(m.builds_on), feeds: strs(m.feeds), updated: str(m.last_updated) ?? '—', synonyms: strs(m.synonyms), useWhen: str(m.use_when),
      history: [], imported: true, expression: str(m.expr) ?? str(m.formula) ?? str(m.in_words),
    })
  }

  for (const t of arr(doc.tables)) {
    const name = str(t.name); if (!name) continue
    let id = slug(name) || 'table'; for (let n = 2; [...ids.values()].includes(id); n++) id = `${slug(name)}_${n}`
    ids.set(slug(name), id)
    const bt = isObj(t.base_table) ? [str(t.base_table.database), str(t.base_table.schema), str(t.base_table.table)].filter(Boolean).join('.') : undefined
    let fields: Field[], fact: boolean
    if (Array.isArray(t.fields)) {
      format = 'Semantix'
      fact = str(t.type) === 'records_of_activity'
      fields = arr(t.fields).map((f) => {
        const fname = str(f.name) ?? '', kind = KINDS.includes(f.kind as FieldKind) ? (f.kind as FieldKind) : 'slice', restricted = f.restricted === true || RESTRICTED.test(fname)
        return { name: fname, kind, type: str(f.type) ?? pretty(kind), description: restricted ? undefined : str(f.description), synonyms: strs(f.synonyms), restricted }
      }).filter((f) => f.name)
    } else {
      fact = arr(t.facts).length > 0 || arr(t.metrics).length > 0
      const mk = (list: unknown, kind: FieldKind, type: string): Field[] => arr(list).flatMap((f) => {
        const fname = str(f.name); if (!fname) return []
        const restricted = RESTRICTED.test(fname)
        return [{ name: fname, kind, type: str(f.data_type) ?? type, description: restricted ? undefined : str(f.description), synonyms: strs(f.synonyms), restricted }]
      })
      fields = [...mk(t.dimensions, 'slice', 'Text'), ...mk(t.time_dimensions, 'date', 'Date'), ...mk(t.facts, 'number', 'Number'), ...mk(t.metrics, 'kpi', 'KPI')]
      arr(t.metrics).forEach((m) => addMetric(m, bt ?? name, pretty(name)))
      arr(t.filters).forEach((f) => { const fn = str(f.name); if (fn) filters.push({ id: `f${filters.length + 1}`, label: pretty(fn), group: 'Other', meaning: str(f.description) ?? str(f.expr) ?? '', table: id, synonyms: strs(f.synonyms) }) })
    }
    tables.push({ id, label: str(t.label) ?? pretty(name), role: fact ? 'fact' : 'dimension', group: fact ? 'Records of activity' : 'Reference lists', description: str(t.description) ?? '', source: str(t.source) ?? bt ?? name, fields })
  }

  // Metrics and filters written at the top level (the Semantix export, or a view-level metric list)
  arr(doc.metrics).forEach((m) => addMetric(m, str(m.table) ?? '', 'Metrics'))
  arr(doc.filters).forEach((f) => {
    const fn = str(f.name); if (!fn) return
    const g = FILTER_GROUPS.find((x) => x === f.group) ?? 'Other', tref = str(f.table)
    filters.push({ id: `f${filters.length + 1}`, label: fn, group: g, meaning: str(f.meaning) ?? str(f.description) ?? str(f.expr) ?? '', table: (tref && ids.get(slug(tref))) || tables[0].id, synonyms: strs(f.synonyms) })
  })

  const joins: Join[] = []
  arr(doc.relationships).forEach((r) => {
    const a = str(r.from) ?? str(r.left_table), b = str(r.to) ?? str(r.right_table)
    const from = a && ids.get(slug(a)), to = b && ids.get(slug(b))
    if (!from || !to) { warnings.push(`A relationship between "${a ?? '?'}" and "${b ?? '?'}" was skipped because one of the tables is missing.`); return }
    const cols = arr(r.relationship_columns).map((c) => pretty(str(c.left_column) ?? '')).filter(Boolean).join(', ')
    joins.push({ from, to, on: str(r.on) ?? (cols || str(r.name) || 'key') })
  })

  const rules: Rule[] = arr(doc.rules).flatMap((r, i) => { const body = str(r.body); const title = str(r.title); return body && title ? [{ id: `r${i + 1}`, title, topic: str(r.topic) ?? 'General', body }] : [] })
  const sections: CtxSection[] = []
  const glossary: GlossaryItem[] = arr(doc.glossary).flatMap((g) => { const term = str(g.term), meaning = str(g.meaning); return term && meaning ? [{ term, meaning }] : [] })
  if (format === 'Semantix') arr(doc.context).forEach((c, i) => { const title = str(c.title), body = str(c.text); if (title && body) sections.push({ id: `ctx${i + 1}`, title, body }) })
  else {
    const ci = str(doc.custom_instructions); if (ci) sections.push({ id: 'ctx1', title: 'Custom instructions', body: ci })
    const mod = isObj(doc.module_custom_instructions) ? doc.module_custom_instructions : {}
    const qc = str(mod.question_categorization); if (qc) sections.push({ id: 'ctx2', title: 'How questions are sorted', body: qc })
    const sg = str(mod.sql_generation)
    if (sg) sg.split('\n').map((l) => l.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').trim()).filter((l) => l.length >= 12).slice(0, 40)
      .forEach((l, i) => rules.push({ id: `r${rules.length + 1}`, title: l.split(/\s+/).slice(0, 7).join(' ') + (l.split(/\s+/).length > 7 ? '…' : ''), topic: 'Instructions', body: l }))
  }

  const nameOf = (q: unknown) => str(q)
  const verified: Question[] = arr(doc.verified_queries).flatMap((q) => {
    const sql = str(q.sql), text = nameOf(q.question) ?? nameOf(q.name); if (!sql || !text) return []
    const at = typeof q.verified_at === 'number' ? new Date(q.verified_at * 1000).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : str(q.verified_at) ?? '—'
    return [{ id: `q${0}`, text, topic: str(q.topic) ?? 'General', by: str(q.verified_by) ?? 'Data team', at, sql }]
  }).map((q, i) => ({ ...q, id: `q${i + 1}` }))
  const mentionRestricted = verified.filter((q) => RESTRICTED.test(q.sql)).length
  if (mentionRestricted) warnings.push(`${mentionRestricted} verified quer${mentionRestricted > 1 ? 'ies mention' : 'y mentions'} fields that look restricted. Check them before sharing.`)

  const flagged = tables.flatMap((t) => t.fields).filter((f) => f.restricted).length
  if (flagged) warnings.push(`${flagged} field${flagged > 1 ? 's were' : ' was'} marked restricted because ${flagged > 1 ? 'their names look' : 'its name looks'} like data about individual people. Their descriptions were dropped. This is a guess based on the name.`)
  const noFields = tables.filter((t) => t.fields.length === 0).length
  if (noFields) warnings.push(`${noFields} table${noFields > 1 ? 's have' : ' has'} no fields.`)

  const semantic: SemanticView = { name: str(doc.name) ?? 'Imported view', description: str(doc.description) ?? '', answers: strs(doc.can_answer), doesNotAnswer: strs(doc.cannot_answer), tables, filters, rules, questions: verified, joins }
  const counts: [string, number][] = [['Tables', tables.length], ['Fields', tables.reduce((a, t) => a + t.fields.length, 0)], ['Relationships', joins.length], ['Metrics', metrics.length], ['Filters', filters.length], ['Rules', rules.length], ['Verified queries', verified.length], ['Context blocks', sections.length], ['Glossary terms', glossary.length]]
  return { ok: true, format, data: { semantic, metrics, context: { sections, glossary } }, counts, warnings }
}
