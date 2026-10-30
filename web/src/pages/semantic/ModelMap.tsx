import { useCallback, useMemo, useState } from 'react'
import { Background, Controls, Handle, MiniMap, Position, ReactFlow, useEdgesState, useNodesState, useReactFlow, ReactFlowProvider, type Edge, type Node, type NodeProps } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { coverage, type SemTable, type SemanticView } from '../../lib/semantic'
import { useTheme } from '../../lib/theme'
import { Icon } from '../../components/Icon'

// Hand-placed positions (top-left x, y). A real loader would lay these out automatically.
const POS: Record<string, { x: number; y: number }> = {
  traffic: { x: 0, y: 40 }, mart: { x: 0, y: 250 }, shop: { x: 330, y: 0 }, orders: { x: 330, y: 150 },
  plm: { x: 330, y: 310 }, consumer: { x: 660, y: 150 }, attrs: { x: 660, y: 310 },
}
/** Positions for tables not in POS (imported views): the most connected table in the middle, the rest around it. */
function autoLayout(view: SemanticView): Record<string, { x: number; y: number }> {
  const deg = (id: string) => view.joins.filter((j) => j.from === id || j.to === id).length
  const sorted = [...view.tables].sort((a, b) => deg(b.id) - deg(a.id))
  const out: Record<string, { x: number; y: number }> = {}
  if (sorted.length > 9) { sorted.forEach((t, i) => { out[t.id] = { x: (i % 4) * 280, y: Math.floor(i / 4) * 130 } }); return out }
  sorted.forEach((t, i) => {
    if (i === 0) { out[t.id] = { x: 330, y: 150 }; return }
    const a = ((i - 1) / Math.max(sorted.length - 1, 1)) * Math.PI * 2 - Math.PI / 2
    out[t.id] = { x: 330 + Math.cos(a) * 340, y: 150 + Math.sin(a) * 190 }
  })
  return out
}
type TData = { t: SemTable; alone: boolean; dim: boolean }

function TableNode({ data, selected }: NodeProps<Node<TData>>) {
  const { t, alone, dim } = data
  const fact = t.role === 'fact', cov = coverage(t.fields)
  return (
    <div className={`w-[220px] rounded-xl border bg-white px-3.5 py-3 shadow-sm transition-opacity dark:bg-neutral-900 ${dim ? 'opacity-30' : ''} ${selected ? 'border-accent-500 ring-2 ring-accent-500/30' : fact ? 'border-accent-300 dark:border-accent-500/50' : 'border-neutral-300 dark:border-neutral-700'} ${alone ? 'border-dashed' : ''}`}>
      <Handle type="target" position={Position.Left} style={{ opacity: 0, left: '50%', top: '50%' }} isConnectable={false} />
      <Handle type="source" position={Position.Right} style={{ opacity: 0, left: '50%', top: '50%' }} isConnectable={false} />
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">{t.label}</span>
        <span className={`badge ${fact ? 'badge-accent' : 'badge-neutral'}`}>{fact ? 'Activity' : 'List'}</span>
      </div>
      <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{alone ? 'No link defined yet · ' : ''}{t.fields.length} fields</p>
      <div className="mt-2 flex items-center gap-2" title={`${cov.pct}% of fields described`}>
        <div className="h-1 flex-1 rounded-full bg-neutral-200 dark:bg-neutral-800"><div className={`h-1 rounded-full ${cov.pct < 90 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${cov.pct}%` }} /></div>
        <span className="text-[10px] tabular-nums text-neutral-500 dark:text-neutral-400">{cov.pct}%</span>
      </div>
    </div>
  )
}
const nodeTypes = { table: TableNode }

function Map({ view, onOpen }: { view: SemanticView; onOpen: (id: string) => void }) {
  const { theme } = useTheme()
  const rf = useReactFlow()
  const linked = useMemo(() => new Set(view.joins.flatMap((j) => [j.from, j.to])), [view])
  const label = (id: string) => view.tables.find((t) => t.id === id)?.label ?? id
  const layout = useMemo(() => (view.tables.every((t) => POS[t.id]) ? POS : autoLayout(view)), [view])
  const base = useMemo<Node<TData>[]>(() => view.tables.map((t) => ({ id: t.id, type: 'table', position: layout[t.id] ?? { x: 0, y: 0 }, data: { t, alone: !linked.has(t.id), dim: false } })), [view, linked, layout])
  const baseEdges = useMemo<Edge[]>(() => view.joins.map((j) => ({ id: `${j.from}-${j.to}`, source: j.from, target: j.to, label: j.on, data: j })), [view])
  const [nodes, setNodes, onNodesChange] = useNodesState(base)
  const [edges, , onEdgesChange] = useEdgesState(baseEdges)
  const [sel, setSel] = useState<{ kind: 'table'; id: string } | { kind: 'edge'; id: string } | null>(null)

  const touching = useMemo(() => {
    if (!sel) return null
    if (sel.kind === 'table') return new Set([sel.id, ...view.joins.filter((j) => j.from === sel.id || j.to === sel.id).flatMap((j) => [j.from, j.to])])
    const j = view.joins.find((x) => `${x.from}-${x.to}` === sel.id)!
    return new Set([j.from, j.to])
  }, [sel, view])
  const shownNodes = nodes.map((n) => ({ ...n, selected: sel?.kind === 'table' && sel.id === n.id, data: { ...n.data, dim: !!touching && !touching.has(n.id) } }))
  const stroke = (hot: boolean) => ({ stroke: hot ? '#8b5cf6' : theme === 'dark' ? '#525252' : '#a3a3a3', strokeWidth: hot ? 2.5 : 1.5 })
  const shownEdges = edges.map((e) => {
    const hot = sel?.kind === 'edge' ? sel.id === e.id : sel?.kind === 'table' ? e.source === sel.id || e.target === sel.id : false
    const dim = !!sel && !hot
    return { ...e, animated: hot, style: { ...stroke(hot), opacity: dim ? 0.2 : 1 }, labelStyle: { fontSize: 11, fill: theme === 'dark' ? '#d4d4d4' : '#404040' }, labelBgStyle: { fill: theme === 'dark' ? '#171717' : '#ffffff' }, labelBgPadding: [6, 3] as [number, number], labelBgBorderRadius: 6 }
  })

  const reset = useCallback(() => { setNodes(base); setSel(null); setTimeout(() => rf.fitView({ padding: 0.15, duration: 300 }), 0) }, [base, setNodes, rf])
  const t = sel?.kind === 'table' ? view.tables.find((x) => x.id === sel.id) : undefined
  const j = sel?.kind === 'edge' ? view.joins.find((x) => `${x.from}-${x.to}` === sel.id) : undefined
  const around = t ? view.joins.filter((x) => x.from === t.id || x.to === t.id) : []

  return (
    <div>
      <div className="relative h-[460px] overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800" role="group" aria-label="Map of the tables and how they connect. Drag boxes to rearrange.">
        <ReactFlow nodes={shownNodes} edges={shownEdges} nodeTypes={nodeTypes} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} colorMode={theme}
          onNodeClick={(_, n) => setSel({ kind: 'table', id: n.id })} onEdgeClick={(_, e) => setSel({ kind: 'edge', id: e.id })} onPaneClick={() => setSel(null)}
          fitView fitViewOptions={{ padding: 0.15 }} nodesConnectable={false} minZoom={0.4} maxZoom={1.6} proOptions={{ hideAttribution: true }}>
          <Background gap={20} />
          <Controls showInteractive={false} />
          <MiniMap pannable zoomable className="!hidden md:!block" nodeColor={(n) => ((n.data as TData).t.role === 'fact' ? '#8b5cf6' : '#a3a3a3')} />
        </ReactFlow>
        <button className="btn btn-outline absolute right-3 top-3 z-10 bg-white !py-1 text-xs dark:bg-neutral-900" onClick={reset}>Reset layout</button>

        {sel && (
          <aside className="absolute bottom-3 left-3 z-10 w-[min(340px,calc(100%-1.5rem))] rounded-xl border border-neutral-200 bg-white p-3.5 shadow-lg dark:border-neutral-800 dark:bg-neutral-900" aria-live="polite">
            {t && (
              <>
                <p className="text-sm font-semibold">{t.label}</p>
                <p className="type-muted mt-1">{t.description}</p>
                {around.length > 0 && <ul className="mt-2 space-y-0.5 text-xs">{around.map((x) => <li key={x.from + x.to}>{sentence(x, label)}</li>)}</ul>}
                <button className="btn btn-primary mt-3 !py-1 text-xs" onClick={() => onOpen(t.id)}>Open its fields <Icon name="arrow" className="h-3.5 w-3.5" /></button>
              </>
            )}
            {j && <><p className="text-sm font-semibold">{label(j.from)} → {label(j.to)}</p><p className="mt-1 text-sm">{sentence(j, label)}</p></>}
          </aside>
        )}
      </div>
      <p className="type-muted mt-2 flex flex-wrap items-center gap-x-5 gap-y-1">
        <span>Drag to move, scroll to zoom, click a table or a link.</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm border border-accent-300 bg-accent-50 dark:bg-accent-500/20" />Activity (orders, traffic)</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm border border-neutral-300 bg-white dark:bg-neutral-900" />Lists (products, shops, consumers)</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm border border-dashed border-neutral-400" />Not linked yet</span>
      </p>
    </div>
  )
}

const sentence = (j: { from: string; to: string; on: string }, label: (id: string) => string) => `Each ${label(j.from).toLowerCase()} row is linked to ${label(j.to).toLowerCase()} through ${j.on}.`

export default function ModelMap(props: { view: SemanticView; onOpen: (id: string) => void }) {
  return <ReactFlowProvider key={props.view.tables.map((t) => t.id).join('|')}><Map {...props} /></ReactFlowProvider>
}
