/** Tick the tables a person can see. `allowed` is what the person above them can see. */
export default function ScopePicker({ allowed, value, onChange }: { allowed: string[]; value: string[]; onChange: (v: string[]) => void }) {
  const all = value.length === allowed.length
  return (
    <fieldset>
      <legend className="label">Tables they can see ({value.length} of {allowed.length})</legend>
      <label className="mb-1 flex items-center gap-2 text-xs"><input type="checkbox" checked={all} onChange={() => onChange(all ? [] : allowed)} /> Same as the person who invites them</label>
      <ul className="max-h-48 divide-y divide-neutral-100 overflow-y-auto rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
        {allowed.map((t) => (
          <li key={t}><label className="flex items-center gap-2 px-3 py-1.5 text-xs"><input type="checkbox" checked={value.includes(t)} onChange={() => onChange(value.includes(t) ? value.filter((x) => x !== t) : [...value, t])} /><span className="type-mono">{t}</span></label></li>
        ))}
      </ul>
    </fieldset>
  )
}
