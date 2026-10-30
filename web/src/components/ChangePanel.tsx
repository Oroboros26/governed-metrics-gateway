import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { suggestChange } from '../lib/mock'
import { Banner } from './ui'
import { Icon } from './Icon'

export type PanelField = { key: string; label: string; kind: 'text' | 'area' | 'select' | 'code'; options?: string[]; required?: boolean; hint?: string }
export type PanelMode = 'add' | 'edit' | 'remove'

/** Side panel to add, change or remove one item. Always ends in "Send for review"; nothing goes live from here. */
export default function ChangePanel({ noun, mode, fields, initial = {}, existing, nameKey, check, onClose }: {
  noun: string; mode: PanelMode; fields: PanelField[]; initial?: Record<string, string>; existing: string[]; nameKey: string
  check?: (v: Record<string, string>) => string | undefined; onClose: () => void
}) {
  const [v, setV] = useState<Record<string, string>>(() => Object.fromEntries(fields.map((f) => [f.key, initial[f.key] ?? (f.kind === 'select' ? f.options?.[0] ?? '' : '')])))
  const [why, setWhy] = useState('')
  const qc = useQueryClient()
  const name = v[nameKey]?.trim() ?? ''
  const verb = mode === 'add' ? 'Add' : mode === 'edit' ? 'Change' : 'Remove'
  const send = useMutation({ mutationFn: () => suggestChange({ target: `${noun} › ${verb.toLowerCase()}: ${name || initial[nameKey]}`, note: why }), onSuccess: () => qc.invalidateQueries({ queryKey: ['changes'] }) })
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k) }, [onClose])

  const dup = mode !== 'remove' && name && existing.some((x) => x.toLowerCase() === name.toLowerCase() && x !== initial[nameKey])
  const missing = mode !== 'remove' && fields.some((f) => f.required && !v[f.key].trim())
  const problem = mode === 'remove' ? undefined : dup ? `A ${noun} called "${name}" already exists.` : check?.(v)
  const unchanged = mode === 'edit' && fields.every((f) => v[f.key] === (initial[f.key] ?? ''))
  const ready = !missing && !problem && !unchanged && why.trim().length >= 5 && !send.isPending

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-30 bg-black/30" onClick={onClose} />
      <motion.aside role="dialog" aria-label={`${verb} ${noun}`} initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 40, opacity: 0 }} transition={{ duration: 0.18 }}
        className="fixed inset-y-0 right-0 z-40 w-full max-w-md overflow-y-auto border-l border-neutral-200 bg-white p-6 shadow-xl dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-tight">{verb} {noun}</h2>
          <button className="btn btn-ghost !px-1.5" onClick={onClose} aria-label="Close"><Icon name="x" /></button>
        </div>

        {send.isSuccess ? (
          <div className="mt-5 space-y-3">
            <Banner kind="success">Sent. A reviewer will check it before it goes live. The page stays as it is until then.</Banner>
            <div className="flex gap-2"><Link to="/app/changes" className="btn btn-primary">Follow it in My Changes</Link><button className="btn btn-ghost" onClick={onClose}>Close</button></div>
          </div>
        ) : (
          <>
            {mode === 'remove' ? (
              <div className="mt-4"><Banner kind="warn">You are asking to remove <b>{initial[nameKey]}</b>. Anything that relies on it may change once a reviewer approves.</Banner></div>
            ) : fields.map((f) => (
              <div key={f.key} className="mt-4">
                <label className="label" htmlFor={`cp-${f.key}`}>{f.label}{f.required && <span aria-hidden="true"> *</span>}</label>
                {f.kind === 'select' ? (
                  <select id={`cp-${f.key}`} className="input" value={v[f.key]} onChange={(e) => setV({ ...v, [f.key]: e.target.value })}>{f.options?.map((o) => <option key={o}>{o}</option>)}</select>
                ) : f.kind === 'text' ? (
                  <input id={`cp-${f.key}`} className="input" value={v[f.key]} onChange={(e) => setV({ ...v, [f.key]: e.target.value })} />
                ) : (
                  <textarea id={`cp-${f.key}`} rows={f.kind === 'code' ? 7 : 3} className={`input ${f.kind === 'code' ? 'type-mono' : ''}`} value={v[f.key]} onChange={(e) => setV({ ...v, [f.key]: e.target.value })} spellCheck={f.kind !== 'code'} />
                )}
                {f.hint && <p className="type-muted mt-1">{f.hint}</p>}
              </div>
            ))}
            {problem && <div className="mt-4"><Banner kind="error">{problem}</Banner></div>}
            <label className="label mt-4" htmlFor="cp-why">Why? <span aria-hidden="true">*</span></label>
            <input id="cp-why" className="input" value={why} onChange={(e) => setWhy(e.target.value)} placeholder="What is missing or wrong today?" />
            <div className="mt-5 flex gap-2">
              <button className="btn btn-primary" disabled={!ready} onClick={() => send.mutate()}>{send.isPending ? 'Sending…' : 'Send for review'}</button>
              <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
            </div>
          </>
        )}
      </motion.aside>
    </>
  )
}

/** Small "Suggest a change / Remove" row for the bottom of a card. */
export const CardActions = ({ onEdit, onRemove, name }: { onEdit: () => void; onRemove: () => void; name: string }) => (
  <div className="mt-3 flex gap-1 border-t border-neutral-100 pt-2 dark:border-neutral-800">
    <button className="btn btn-ghost !px-2 !py-1 text-xs" onClick={onEdit} aria-label={`Suggest a change to ${name}`}>Suggest a change</button>
    <button className="btn btn-ghost !px-2 !py-1 text-xs" onClick={onRemove} aria-label={`Remove ${name}`}>Remove</button>
  </div>
)
