import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useQueryClient } from '@tanstack/react-query'
import { parseSemanticYaml, type ImportResult } from '../lib/importYaml'
import { saveStored } from '../lib/store'
import { Banner } from './ui'
import { Icon } from './Icon'

const MAX = 8 * 1024 * 1024

/** Pick a YAML file, preview what it contains, then replace the view's content. Everything stays in the browser. */
export default function ImportDialog({ viewId, viewName, replacing, onClose }: { viewId: string; viewName: string; replacing: boolean; onClose: () => void }) {
  const qc = useQueryClient()
  const [file, setFile] = useState<string>()
  const [res, setRes] = useState<ImportResult | null>(null)
  const [err, setErr] = useState<string>()
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k) }, [onClose])

  const pick = async (f?: File) => {
    if (!f) return
    setErr(undefined); setRes(null); setFile(f.name)
    if (f.size > MAX) { setErr('This file is larger than 8 MB. Remove the sample values first (strip_sample_values.py) and try again.'); return }
    setRes(parseSemanticYaml(await f.text()))
  }
  const doImport = () => {
    if (!res?.ok) return
    const e = saveStored(viewId, { ...res.data, importedAt: new Date().toISOString(), source: file ?? 'file' })
    if (e) { setErr(e); return }
    qc.invalidateQueries(); onClose()
  }

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-30 bg-black/30" onClick={onClose} />
      <motion.aside role="dialog" aria-label={`Import a YAML file into ${viewName}`} initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 40, opacity: 0 }} transition={{ duration: 0.18 }}
        className="fixed inset-y-0 right-0 z-40 w-full max-w-lg overflow-y-auto border-l border-neutral-200 bg-white p-6 shadow-xl dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-tight">Import a YAML file into {viewName}</h2>
          <button className="btn btn-ghost !px-1.5" onClick={onClose} aria-label="Close"><Icon name="x" /></button>
        </div>
        <p className="type-muted mt-2">The file is read in your browser and never uploaded. Works with a Snowflake semantic view or a file downloaded from Semantix. Remove sample values first.</p>

        <input ref={ref} type="file" accept=".yaml,.yml,text/yaml" className="sr-only" aria-label="Choose a YAML file" onChange={(e) => pick(e.target.files?.[0])} />
        <button className="btn btn-outline mt-4" onClick={() => ref.current?.click()}><Icon name="plus" /> {file ? 'Choose a different file' : 'Choose a YAML file'}</button>
        {file && <span className="type-mono ml-3 align-middle">{file}</span>}

        {err && <div className="mt-4"><Banner kind="error">{err}</Banner></div>}
        {res && !res.ok && <div className="mt-4"><Banner kind="error">{res.error}</Banner></div>}
        {res?.ok && (
          <div className="mt-5">
            <p className="text-sm font-medium">Found a {res.format === 'Snowflake' ? 'Snowflake-style' : 'Semantix'} file{res.data.semantic.name ? `: ${res.data.semantic.name}` : ''}</p>
            <dl className="mt-3 grid grid-cols-3 gap-2">
              {res.counts.map(([l, n]) => <div key={l} className="rounded-lg border border-neutral-200 px-3 py-2 dark:border-neutral-800"><dt className="type-muted">{l}</dt><dd className="text-lg font-semibold tabular-nums">{n}</dd></div>)}
            </dl>
            {res.warnings.length > 0 && <div className="mt-4 space-y-2">{res.warnings.map((w) => <Banner key={w} kind="warn">{w}</Banner>)}</div>}
            {replacing && <div className="mt-4"><Banner kind="info">This replaces everything currently in {viewName}.</Banner></div>}
            <div className="mt-5 flex gap-2">
              <button className="btn btn-primary" onClick={doImport}>{replacing ? 'Replace content' : 'Import'}</button>
              <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
            </div>
          </div>
        )}
      </motion.aside>
    </>
  )
}
