import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate, useOutlet, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Icon, Logo } from './Icon'
import SearchPalette from './SearchPalette'
import { useTheme } from '../lib/theme'
import { listChanges, listMetrics } from '../lib/mock'
import { listMRs, resetWorkflow } from '../lib/workflow'
import { PERSONAS, useRole, type Role } from '../lib/role'
import DemoGuide from './DemoGuide'
import { getSemanticView } from '../lib/semantic'
import { SECTIONS, findView, getViews, hasData, path } from '../lib/views'
import { useStoreVersion } from '../lib/store'

const OPEN = 232, CLOSED = 52
const LAST = (v: string) => `sx-last-${v}`

function NavItem({ to, icon, text, count, dot, dotTitle, collapsed, ai }: { to: string; icon: keyof typeof import('./Icon') | string; text: string; count?: number | string; dot?: boolean; dotTitle?: string; collapsed: boolean; ai?: boolean }) {
  return (
    <NavLink to={to} title={text} aria-label={text} className="relative mt-0.5 flex items-center rounded-lg px-2.5 py-2 text-sm">
      {({ isActive }) => (
        <>
          {isActive && <motion.span layoutId="nav-pill" className="absolute inset-0 rounded-lg bg-accent-50 dark:bg-accent-500/10" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
          <span className={`relative z-10 flex flex-1 items-center gap-2.5 ${isActive ? 'font-medium text-accent-700 dark:text-accent-300' : 'text-neutral-600 hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-neutral-100'}`}>
            <Icon name={icon as never} className="h-4 w-4 shrink-0" />
            {!collapsed && <span className="flex-1 truncate">{text}</span>}
            {!collapsed && ai && <span className="badge badge-accent !px-1.5">AI</span>}
            {!collapsed && dot && <span title={dotTitle} className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-label={dotTitle} />}
            {!collapsed && count !== undefined && <span className="type-muted tabular-nums">{count}</span>}
          </span>
        </>
      )}
    </NavLink>
  )
}

export default function Layout() {
  const [collapsed, setCollapsed] = useState(() => { try { return localStorage.getItem('sx-nav') === '1' } catch { return false } })
  const [areaOpen, setAreaOpen] = useState(true)
  const [menu, setMenu] = useState(false)
  const [switcher, setSwitcher] = useState(false)
  const [palette, setPalette] = useState(false)
  const { theme, toggle } = useTheme()
  const { role, persona, setRole } = useRole()
  const qc = useQueryClient()
  const loc = useLocation()
  const nav = useNavigate()
  const outlet = useOutlet()
  const [sp] = useSearchParams()

  const parts = loc.pathname.split('/').filter(Boolean) // app, v, <view>, <section>, <name>, edit
  const inView = parts[1] === 'v'
  const viewId = inView ? parts[2] : (() => { try { return localStorage.getItem('sx-view') ?? 'd2c' } catch { return 'd2c' } })()
  useStoreVersion() // re-render when a view is imported or created
  const views = getViews()
  const view = findView(viewId) ?? views[0]
  const live = hasData(view.id)

  const changes = useQuery({ queryKey: ['changes'], queryFn: listChanges }).data
  const sem = useQuery({ queryKey: ['semantic', view.id], queryFn: () => getSemanticView(view.id) }).data
  const metrics = useQuery({ queryKey: ['metrics', view.id], queryFn: () => listMetrics(view.id) }).data
  const mrs = useQuery({ queryKey: ['mrs'], queryFn: listMRs }).data
  const inReview = changes?.filter((c) => c.by === persona.name && c.stage !== 'live').length
  const toReview = changes?.filter((c) => c.stage === 'analyst_review').length
  const openMRs = mrs?.filter((m) => m.status === 'open').length
  const contextPending = !!changes?.some((c) => c.area === 'Business context' && c.stage !== 'live' && c.stage !== 'sent_back')
  const undocumented = sem ? sem.tables.flatMap((t) => t.fields).filter((f) => !f.description && !f.restricted).length : 0
  const counts: Record<string, number | undefined> = !live ? {} : {
    tables: sem?.tables.length, metrics: metrics?.length, filters: sem?.filters.length, rules: sem?.rules.length, queries: sem?.questions.length,
  }

  // Remember where you were in each view, so switching back returns you there.
  useEffect(() => { if (inView && findView(parts[2])) { try { localStorage.setItem(LAST(parts[2]), loc.pathname + loc.search); localStorage.setItem('sx-view', parts[2]) } catch {} } }, [loc.pathname, loc.search]) // eslint-disable-line
  useEffect(() => { const k = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPalette(true) } }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k) }, [])

  const setNav = (v: boolean) => { setCollapsed(v); try { localStorage.setItem('sx-nav', v ? '1' : '0') } catch {} }
  const pickView = (id: string) => { setSwitcher(false); let to = path.section(id, 'overview'); try { to = localStorage.getItem(LAST(id)) ?? to } catch {} nav(to) }

  // Breadcrumbs from the URL
  const crumbs: { text: string; to?: string }[] = []
  const PAGE: Record<string, string> = { changes: 'My Changes', review: 'Review queue', team: 'My team', warehouse: role === 'business' ? 'Data access' : role === 'engineer' ? 'Connections' : 'Warehouse connection', setup: 'Setup guide', engineering: 'Overview', mrs: 'Merge requests', people: 'People and access', mcp: 'MCP', repo: 'Repository' }
  if (parts[1] && PAGE[parts[1]]) {
    if (parts[1] === 'mrs' && parts[2]) crumbs.push({ text: PAGE.mrs, to: '/app/mrs' }, { text: parts[2] })
    else crumbs.push({ text: PAGE[parts[1]] })
  }
  else if (parts[1] === 'views') crumbs.push({ text: 'Semantic Layer' }, { text: 'All views' })
  else if (inView) {
    const sec = parts[3]
    const secLabel = sec === 'context' ? 'Business context' : sec === 'new' ? 'Metrics' : SECTIONS.find((s) => s.id === sec)?.label ?? sec
    crumbs.push({ text: 'Semantic Layer', to: '/app/views' }, { text: view.name, to: path.section(view.id, 'overview') })
    crumbs.push({ text: secLabel, to: sec === 'new' ? path.section(view.id, 'metrics') : sec !== 'overview' ? path.section(view.id, sec) : undefined })
    if (sec === 'tables' && sp.get('table')) crumbs.push({ text: sem?.tables.find((t) => t.id === sp.get('table'))?.label ?? 'Table' })
    if (sec === 'metrics' && parts[4]) crumbs.push({ text: metrics?.find((m) => m.name === parts[4])?.title ?? 'Metric', to: parts[5] ? path.metric(view.id, parts[4]) : undefined })
    if (parts[5] === 'edit') crumbs.push({ text: 'Edit' })
    if (sec === 'new') crumbs.push({ text: 'Add metric' })
  }

  const flatNav = (
    <>
      {SECTIONS.map((s) => (
        <NavItem key={s.id} to={path.section(view.id, s.id)} icon={s.icon} text={s.label} collapsed={collapsed} count={counts[s.id]}
          dot={s.id === 'tables' && live && undocumented > 0} dotTitle={`${undocumented} fields have no description`} />
      ))}
      <div className="my-2 border-t border-neutral-200 dark:border-neutral-800" />
      <NavItem to={path.section(view.id, 'context')} icon="sparkle" text="Business context" collapsed={collapsed} dot={contextPending} dotTitle="A change is waiting for review" />
    </>
  )

  return (
    <div className="flex h-screen bg-white dark:bg-neutral-950">
      <motion.aside initial={false} animate={{ width: collapsed ? CLOSED : OPEN }} transition={{ duration: 0.2, ease: 'easeOut' }}
        className="relative flex shrink-0 flex-col border-r border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex h-14 items-center justify-between px-3.5">
          {!collapsed && <Link to="/app/views" aria-label="Semantix home"><Logo /></Link>}
          <button className="btn btn-ghost !px-1.5" onClick={() => setNav(!collapsed)} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} aria-expanded={!collapsed}><Icon name="panel" /></button>
        </div>

        <div className="px-2">
          <button onClick={() => setPalette(true)} title="Search (Ctrl+K)" aria-label="Search"
            className="flex w-full items-center gap-2 rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-sm text-neutral-500 hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-950">
            <Icon name="search" className="h-4 w-4" />{!collapsed && <><span className="flex-1 text-left">Search</span><kbd className="rounded border border-neutral-200 px-1 text-[10px] dark:border-neutral-700">Ctrl K</kbd></>}
          </button>
        </div>

        <nav aria-label="Main" className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-3">
          {role === 'analyst' && <NavItem to="/app/review" icon="inbox" text="Review queue" collapsed={collapsed} count={toReview || undefined} />}
          {role === 'engineer' && <>
            <NavItem to="/app/engineering" icon="home" text="Overview" collapsed={collapsed} />
            <NavItem to="/app/mrs" icon="merge" text="Merge requests" collapsed={collapsed} count={openMRs || undefined} />
          </>}
          {role !== 'business' && <div className="my-2 border-t border-neutral-200 dark:border-neutral-800" />}
          {!collapsed ? (
            <div>
              <button className="flex w-full items-center justify-between rounded-md px-2 py-1 text-sm font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800" onClick={() => setAreaOpen((o) => !o)} aria-expanded={areaOpen}>
                <span className="flex items-center gap-2"><Icon name="layers" className="h-4 w-4 text-accent-500" />Semantic Layer</span><Icon name="chevron" className={`h-3 w-3 transition-transform ${areaOpen ? '' : '-rotate-90'}`} />
              </button>
              <AnimatePresence initial={false}>
                {areaOpen && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.15 }} className="overflow-hidden">
                    <div className="relative my-2">
                      <button onClick={() => setSwitcher((s) => !s)} aria-haspopup="listbox" aria-expanded={switcher} aria-label={`Semantic view: ${view.name}. Change view`}
                        className="flex w-full items-center justify-between rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium hover:border-accent-500/60 dark:border-neutral-800 dark:bg-neutral-950">
                        <span className="flex items-center gap-2"><span className="h-2 w-2 rotate-45 rounded-[2px] bg-accent-500" />{view.name}{!live && <span className="badge badge-neutral">Empty</span>}</span>
                        <Icon name="chevron" className="h-3.5 w-3.5" />
                      </button>
                      <AnimatePresence>
                        {switcher && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setSwitcher(false)} />
                            <motion.ul role="listbox" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.12 }}
                              className="absolute left-0 right-0 top-full z-20 mt-1 rounded-xl border border-neutral-200 bg-white p-1.5 shadow-lg dark:border-neutral-800 dark:bg-neutral-900">
                              {views.map((v) => (
                                <li key={v.id}>
                                  <button role="option" aria-selected={v.id === view.id} onClick={() => pickView(v.id)} className="flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800">
                                    <Icon name="check" className={`mt-0.5 h-4 w-4 shrink-0 ${v.id === view.id ? 'text-accent-500' : 'opacity-0'}`} />
                                    <span><span className="block text-sm font-medium">{v.name}</span><span className="type-muted">{!hasData(v.id) ? 'Empty, import a file' : inReview ? `${inReview} change${inReview > 1 ? 's' : ''} in progress` : 'Up to date'}</span></span>
                                  </button>
                                </li>
                              ))}
                              <li className="mt-1 border-t border-neutral-100 pt-1 dark:border-neutral-800">
                                <Link to="/app/views" onClick={() => setSwitcher(false)} className="btn btn-ghost w-full !justify-start">All semantic views</Link>
                              </li>
                            </motion.ul>
                          </>
                        )}
                      </AnimatePresence>
                    </div>
                    {flatNav}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : flatNav}

          <div className="my-3 border-t border-neutral-200 dark:border-neutral-800" />
          {role !== 'engineer' && <NavItem to="/app/changes" icon="changes" text="My Changes" collapsed={collapsed} count={inReview || undefined} />}
          {role === 'analyst' && <NavItem to="/app/team" icon="users" text="My team" collapsed={collapsed} />}
          {role === 'engineer' && <>
            <NavItem to="/app/mcp" icon="bot" text="MCP" collapsed={collapsed} />
            <NavItem to="/app/people" icon="users" text="People and access" collapsed={collapsed} />
            <NavItem to="/app/repo" icon="layers" text="Repository" collapsed={collapsed} />
          </>}
          <NavItem to="/app/warehouse" icon="database" text={role === 'business' ? 'Data access' : role === 'engineer' ? 'Connections' : 'Warehouse'} collapsed={collapsed} />
          {role !== 'business' && <NavItem to="/app/setup" icon="book" text="Setup guide" collapsed={collapsed} />}
        </nav>

        <div className="relative border-t border-neutral-200 p-2 dark:border-neutral-800">
          <button onClick={() => setMenu((m) => !m)} aria-haspopup="menu" aria-expanded={menu} aria-label="User menu" className="flex w-full items-center gap-2.5 rounded-lg px-1.5 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-500 text-xs font-semibold text-white">{persona.name[0]}</span>
            {!collapsed && <span className="min-w-0 text-left"><span className="block truncate text-sm font-medium">{persona.name}</span><span className="type-muted block truncate">{persona.title}</span></span>}
          </button>
          <AnimatePresence>
            {menu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
                <motion.div role="menu" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} transition={{ duration: 0.12 }}
                  className="absolute bottom-14 left-2 z-20 w-56 rounded-xl border border-neutral-200 bg-white p-1.5 shadow-lg dark:border-neutral-800 dark:bg-neutral-900">
                  <div className="px-2.5 py-2"><p className="text-sm font-medium">{persona.name}</p><p className="type-muted">{persona.title}</p></div>
                  <div className="my-1 border-t border-neutral-200 dark:border-neutral-800" />
                  <p className="type-label-caps px-2.5 pt-1">Switch role (demo)</p>
                  {(Object.keys(PERSONAS) as Role[]).map((r) => (
                    <button key={r} role="menuitemradio" aria-checked={role === r} onClick={() => { setRole(r); setMenu(false); nav(PERSONAS[r].home) }} className="btn btn-ghost w-full !justify-start">
                      <Icon name="check" className={`h-4 w-4 ${role === r ? 'text-accent-500' : 'opacity-0'}`} />{PERSONAS[r].name} <span className="type-muted">· {r === 'business' ? 'business user' : r === 'analyst' ? 'data analyst' : 'data engineer'}</span>
                    </button>
                  ))}
                  <button role="menuitem" onClick={() => { if (window.confirm('Reset the demo data (requests, merge requests, people)?')) { resetWorkflow(); ['sx-people', 'sx-agents'].forEach((k) => { try { localStorage.removeItem(k) } catch { /* ignore */ } }); window.location.reload() } }} className="btn btn-ghost w-full !justify-start"><Icon name="swap" /> Reset demo data</button>
                  <div className="my-1 border-t border-neutral-200 dark:border-neutral-800" />
                  <button role="menuitem" onClick={toggle} className="btn btn-ghost w-full !justify-start"><Icon name={theme === 'dark' ? 'sun' : 'moon'} /> {theme === 'dark' ? 'Light theme' : 'Dark theme'}</button>
                  <Link role="menuitem" to="/" className="btn btn-ghost w-full !justify-start"><Icon name="out" /> Sign out</Link>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </motion.aside>

      <main className="min-w-0 flex-1 overflow-y-auto">
        <div className="border-b border-neutral-200 bg-neutral-50 px-6 py-1.5 text-center text-xs text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">Prototype: all data on these screens is sample data.</div>
        <div className="px-6 pt-5 lg:px-8">
          <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-xs text-neutral-500">
            {crumbs.map((c, i) => (
              <span key={i} className="flex items-center gap-1.5">
                {i > 0 && <Icon name="chevron" className="h-3 w-3 -rotate-90 opacity-60" />}
                {c.to ? <Link to={c.to} className="hover:text-neutral-900 dark:hover:text-neutral-100">{c.text}</Link> : <span aria-current={i === crumbs.length - 1 ? 'page' : undefined} className={i === crumbs.length - 1 ? 'font-medium text-neutral-900 dark:text-neutral-100' : ''}>{c.text}</span>}
              </span>
            ))}
          </nav>
        </div>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={loc.pathname} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="px-6 pb-8 pt-4 lg:px-8">
            {outlet}
          </motion.div>
        </AnimatePresence>
      </main>
      <DemoGuide />
      <SearchPalette open={palette} onClose={() => setPalette(false)} view={view.id} />
    </div>
  )
}
