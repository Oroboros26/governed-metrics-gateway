import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useRole, type Role } from '../lib/role'
import { ALL_TABLES, listPeople, ROLE_TABLES } from '../lib/people'
import { Banner, PageHeader } from '../components/ui'
import { Icon } from '../components/Icon'

type Conn = { connected: boolean; account: string; warehouse: string; whRole: string; at: string }
const DEFAULTS: Record<'analyst' | 'engineer', Conn> = {
  analyst: { connected: true, account: 'example-account', warehouse: 'ANALYST_XS', whRole: 'ECOM_ANALYST', at: '2 min ago' },
  engineer: { connected: true, account: 'example-account', warehouse: 'PLATFORM_XS', whRole: 'SEMANTIX_READONLY', at: '10 min ago' },
}
export const readWarehouse = (r: Role): Conn => { try { const x = localStorage.getItem(`sx-wh-${r}`); if (x) return JSON.parse(x) as Conn } catch { /* default */ } return DEFAULTS[r === 'analyst' ? 'analyst' : 'engineer'] }
const CHECKS = ['Warehouse is reachable', 'The role can read the schema information', 'A simple SELECT works', 'Safe limits are on (SELECT only, row cap, time limit)']

const GL_CHECKS = ['The access token is valid', 'A test merge request can be opened', 'The webhook reaches Semantix', 'The main branch only accepts merge requests']

/** Runs a list of sample checks one by one. */
function useChecks(n: number) {
  const [passed, setPassed] = useState(0); const [testing, setTesting] = useState(false); const [ran, setRan] = useState(false)
  const run = (then?: () => void) => { setTesting(true); setRan(true); setPassed(0); for (let i = 0; i < n; i++) setTimeout(() => { setPassed(i + 1); if (i === n - 1) { setTesting(false); then?.() } }, 450 * (i + 1)) }
  return { passed, testing, ran, run, reset: () => { setPassed(0); setRan(false) } }
}
const Checklist = ({ items, passed, testing, ran }: { items: string[]; passed: number; testing: boolean; ran: boolean }) => (
  <ul className="space-y-2" aria-live="polite">{items.map((c, i) => <li key={c} className="flex items-center gap-2 text-sm">{i < passed ? <Icon name="check" className="h-4 w-4 text-emerald-500" /> : <span className={`h-4 w-4 rounded-full border ${testing && i === passed ? 'animate-pulse border-accent-500' : 'border-neutral-300 dark:border-neutral-700'}`} />}<span className={i < passed ? '' : 'text-neutral-500'}>{c}{!ran && i === 0 ? '' : ''}</span></li>)}</ul>
)
const Fact = ({ k, v, mono }: { k: string; v: string; mono?: boolean }) => <div className="flex justify-between gap-3 text-xs"><dt className="text-neutral-500">{k}</dt><dd className={mono ? 'type-mono truncate' : 'truncate'}>{v}</dd></div>

function Tile({ icon, name, status, children, actions }: { icon: 'database' | 'merge'; name: string; status: boolean; children: React.ReactNode; actions: React.ReactNode }) {
  return (
    <section className="card flex flex-col" aria-label={`${name} connection`}>
      <div className="flex items-center justify-between"><span className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-50 text-accent-600 dark:bg-accent-500/10 dark:text-accent-300"><Icon name={icon} className="h-4 w-4" /></span><h2 className="type-section-title">{name}</h2></span>
        <span className={`badge ${status ? 'badge-success' : 'badge-neutral'}`}>{status ? 'Connected' : 'Not connected'}</span></div>
      <dl className="mt-4 flex-1 space-y-1.5">{children}</dl>
      <div className="mt-4 flex flex-wrap gap-2 border-t border-neutral-100 pt-3 dark:border-neutral-800">{actions}</div>
    </section>
  )
}

export default function Warehouse() {
  const { role, persona } = useRole()
  const people = useQuery({ queryKey: ['people'], queryFn: listPeople }).data
  const [conn, setConn] = useState<Conn>(() => readWarehouse(role))
  const [panel, setPanel] = useState<'sf' | 'gl' | null>(null)
  const [tab, setTab] = useState<'checks' | 'tables'>('checks')
  const [q, setQ] = useState('')
  const sf = useChecks(CHECKS.length), gl = useChecks(GL_CHECKS.length)
  useEffect(() => { setConn(readWarehouse(role)); setPanel(null); sf.reset(); gl.reset() }, [role]) // eslint-disable-line
  const save = (c: Conn) => { setConn(c); try { localStorage.setItem(`sx-wh-${role}`, JSON.stringify(c)) } catch { /* not saved */ } }
  const sso = role === 'analyst'
  const tables = useMemo(() => (sso ? ROLE_TABLES[conn.whRole] ?? ROLE_TABLES.ECOM_ANALYST : ALL_TABLES), [sso, conn.whRole])
  const shown = tables.filter((t) => t.toLowerCase().includes(q.trim().toLowerCase()))

  if (role === 'business') {
    const me = people?.find((p) => p.name === persona.name); const boss = people?.find((p) => p.id === me?.parent)
    return (<><PageHeader title="Data access" sub="Which tables you can work with." />
      <div className="card max-w-xl"><p className="text-sm">Your analyst <b>{boss?.name}</b> gives you access to <b>{me?.tables.length}</b> of their {boss?.tables.length} tables. You never connect to the warehouse yourself.</p>
        <ul className="mt-3 flex flex-wrap gap-1.5">{me?.tables.map((t) => <li key={t} className="badge badge-neutral type-mono">{t}</li>)}</ul></div></>)
  }

  return (
    <>
      <PageHeader title={sso ? 'Warehouse connection' : 'Connections'} sub={sso ? 'Connect with your own company sign-in. You only see the tables your role can see.' : 'Snowflake and GitLab: the two systems Semantix talks to.'}
        action={<Link to="/app/setup" className="btn btn-ghost">Setup guide</Link>} />
      <div className="mb-4"><Banner kind="info">Prototype: nothing is really connected. This shows how it would look.</Banner></div>

      <div className={`grid gap-4 ${sso ? 'max-w-xl' : 'md:grid-cols-2'}`}>
        <Tile icon="database" name="Snowflake" status={conn.connected}
          actions={<><button className="btn btn-outline" disabled={sf.testing} onClick={() => { setTab('checks'); sf.run(() => save({ ...conn, at: 'Just now' })) }}>{sf.testing ? `Checking… ${sf.passed}/${CHECKS.length}` : 'Test'}</button><button className="btn btn-ghost" onClick={() => setPanel('sf')}>{conn.connected ? 'Reconnect' : 'Connect'}</button></>}>
          <Fact k="Signed in as" v={sso ? `${persona.name} (company SSO)` : 'Department key'} /><Fact k="Role" v={conn.whRole} mono /><Fact k="Warehouse" v={conn.warehouse} mono /><Fact k="Tables visible" v={String(tables.length)} /><Fact k="Last checked" v={conn.at} />
        </Tile>
        {!sso && (
          <Tile icon="merge" name="GitLab" status
            actions={<><button className="btn btn-outline" disabled={gl.testing} onClick={() => { setTab('checks'); gl.run() }}>{gl.testing ? `Checking… ${gl.passed}/${GL_CHECKS.length}` : 'Test'}</button><button className="btn btn-ghost" onClick={() => setPanel('gl')}>Reconnect</button></>}>
            <Fact k="Project" v="semantix/semantic-views" mono /><Fact k="Branch" v="main (protected)" mono /><Fact k="Token" v="Project access token" /><Fact k="Webhook" v="Receiving events" /><Fact k="Last checked" v="10 min ago" />
          </Tile>
        )}
      </div>

      <section className="card mt-4 !p-0">
        <div role="tablist" className="flex gap-1 border-b border-neutral-200 px-3 pt-2 dark:border-neutral-800">
          {([['checks', 'Checks'], ['tables', `${sso ? 'Tables your role can see' : 'Snowflake tables'} (${tables.length})`]] as const).map(([k, l]) => (
            <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`-mb-px border-b-2 px-3 py-2 text-sm ${tab === k ? 'border-accent-500 font-medium' : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100'}`}>{l}</button>
          ))}
        </div>
        <div className="p-4">
          {tab === 'checks' && (
            <div className={`grid gap-6 ${sso ? '' : 'md:grid-cols-2'}`}>
              <div><h3 className="type-label-caps mb-3">Snowflake</h3><Checklist items={CHECKS} {...sf} />{!sf.ran && <p className="type-muted mt-3">Press Test on the Snowflake tile to run these.</p>}</div>
              {!sso && <div><h3 className="type-label-caps mb-3">GitLab</h3><Checklist items={GL_CHECKS} {...gl} />{!gl.ran && <p className="type-muted mt-3">Press Test on the GitLab tile to run these.</p>}</div>}
            </div>
          )}
          {tab === 'tables' && (
            <div>
              <input className="input max-w-xs" aria-label="Find a table" placeholder="Find a table" value={q} onChange={(e) => setQ(e.target.value)} />
              <ul className="mt-3 grid max-h-64 gap-1.5 overflow-y-auto sm:grid-cols-2 xl:grid-cols-3">{shown.map((t) => <li key={t} className="type-mono rounded border border-neutral-200 px-2.5 py-1.5 dark:border-neutral-800">{t}</li>)}{shown.length === 0 && <li className="type-muted">No table matches.</li>}</ul>
            </div>
          )}
        </div>
      </section>

      <AnimatePresence>{panel === 'sf' && <SfPanel key="sf" sso={sso} persona={persona.name} conn={conn} onClose={() => setPanel(null)} onSave={(c) => { save(c); setPanel(null) }} />}</AnimatePresence>
      <AnimatePresence>{panel === 'gl' && <GlPanel key="gl" onClose={() => setPanel(null)} />}</AnimatePresence>
    </>
  )
}

function Side({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k) }, [onClose])
  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-30 bg-black/30" onClick={onClose} />
      <motion.aside role="dialog" aria-label={title} initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 40, opacity: 0 }} transition={{ duration: 0.18 }}
        className="fixed inset-y-0 right-0 z-40 w-full max-w-md overflow-y-auto border-l border-neutral-200 bg-white p-6 shadow-xl dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-start justify-between"><h2 className="text-lg font-semibold tracking-tight">{title}</h2><button className="btn btn-ghost !px-1.5" onClick={onClose} aria-label="Close"><Icon name="x" /></button></div>
        {children}
      </motion.aside>
    </>
  )
}

function SfPanel({ sso, persona, conn, onClose, onSave }: { sso: boolean; persona: string; conn: Conn; onClose: () => void; onSave: (c: Conn) => void }) {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState({ account: conn.account, warehouse: conn.warehouse, whRole: conn.whRole })
  const t = useChecks(CHECKS.length)
  const list = sso ? ROLE_TABLES[form.whRole] ?? [] : ALL_TABLES
  return (
    <Side title="Connect to Snowflake" onClose={onClose}>
      <ol className="mt-4 flex flex-wrap gap-4 text-xs">{['Account', 'Sign in', 'Test', 'Tables'].map((s, i) => <li key={s} className={`flex items-center gap-1.5 ${i === step ? 'font-semibold' : i < step ? 'text-emerald-600 dark:text-emerald-400' : 'text-neutral-400'}`}><span className="flex h-5 w-5 items-center justify-center rounded-full border text-[10px]">{i < step ? '✓' : i + 1}</span>{s}</li>)}</ol>
      <div className="mt-5">
        {step === 0 && <div className="space-y-3">
          {(['account', 'warehouse', 'whRole'] as const).map((k) => <div key={k}><label className="label" htmlFor={`w-${k}`}>{{ account: 'Account', warehouse: 'Warehouse', whRole: 'Role' }[k]}</label>
            {k === 'whRole' && sso ? <select id="w-whRole" className="input" value={form.whRole} onChange={(e) => setForm({ ...form, whRole: e.target.value })}>{Object.keys(ROLE_TABLES).map((r) => <option key={r}>{r}</option>)}</select> : <input id={`w-${k}`} className="input type-mono" value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />}</div>)}
          <button className="btn btn-primary" onClick={() => setStep(1)} disabled={!form.account.trim() || !form.warehouse.trim()}>Next</button></div>}
        {step === 1 && <div className="space-y-3">{sso
          ? <><p className="text-sm">You sign in with your company account, {persona}. Semantix never sees your password and only asks for what your role can see.</p><button className="btn btn-primary" onClick={() => setStep(2)}>Sign in with company SSO</button></>
          : <><p className="text-sm">Use the department key for read-only checks. It can read table information and run simple SELECT statements, nothing else.</p><div className="rounded-lg border border-dashed border-neutral-300 p-4 text-center text-sm text-neutral-500 dark:border-neutral-700">Key file: <span className="type-mono">semantix_readonly.p8</span> (sample)</div><button className="btn btn-primary" onClick={() => setStep(2)}>Use this key</button></>}</div>}
        {step === 2 && <div className="space-y-4"><Checklist items={CHECKS} {...t} />
          {t.passed < CHECKS.length ? <button className="btn btn-primary" disabled={t.testing} onClick={() => t.run()}>{t.testing ? 'Testing…' : 'Test the connection'}</button> : <button className="btn btn-primary" onClick={() => setStep(3)}>Next</button>}</div>}
        {step === 3 && <div className="space-y-3"><p className="text-sm">This role can see <b>{list.length}</b> tables. They define what you can work with.</p>
          <ul className="flex max-h-48 flex-wrap gap-1.5 overflow-y-auto">{list.map((x) => <li key={x} className="badge badge-neutral type-mono">{x}</li>)}</ul>
          <button className="btn btn-primary" onClick={() => onSave({ connected: true, ...form, at: 'Just now' })}>Finish</button></div>}
      </div>
    </Side>
  )
}

function GlPanel({ onClose }: { onClose: () => void }) {
  const [path, setPath] = useState('semantix/semantic-views'); const [token, setToken] = useState('')
  const [saved, setSaved] = useState(false)
  return (
    <Side title="Reconnect GitLab" onClose={onClose}>
      <label className="label mt-4" htmlFor="gp">Project path</label><input id="gp" className="input type-mono" value={path} onChange={(e) => setPath(e.target.value)} />
      <label className="label mt-3" htmlFor="gt">Access token</label><input id="gt" type="password" autoComplete="off" className="input" value={token} onChange={(e) => setToken(e.target.value)} placeholder="Paste the project access token" />
      <p className="type-muted mt-2">Prototype: the token is not stored or sent anywhere. In the product it goes to the server's secret store, never the browser. <Link to="/app/setup" className="underline">How to create it</Link></p>
      {saved ? <div className="mt-4"><Banner kind="success">Saved (sample). Run Test to check it.</Banner></div> : <div className="mt-4 flex gap-2"><button className="btn btn-primary" disabled={!path.trim() || token.length < 8} onClick={() => { setToken(''); setSaved(true) }}>Save</button><button className="btn btn-ghost" onClick={onClose}>Cancel</button></div>}
    </Side>
  )
}
