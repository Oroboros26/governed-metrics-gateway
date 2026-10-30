import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Icon, Logo } from '../components/Icon'

const Reveal = ({ children, delay = 0, className = '' }: { children: ReactNode; delay?: number; className?: string }) => (
  <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.5, delay }} className={className}>
    {children}
  </motion.div>
)

const STEPS = [
  ['Define', 'Business users pick tables and columns in plain language. No SQL needed.'],
  ['Test', 'Every change is compiled and dry-run on seven days of data before anyone relies on it.'],
  ['Review', 'The data team approves it, or sends it back with a clear reason.'],
  ['Serve', 'Approved metrics go live for dashboards and AI agents through REST and MCP.'],
]
const FEATURES = [
  ['Views scoped to your role', 'An e-commerce analyst sees e-commerce metrics. Finance sees finance. Nobody browses what is not theirs.'],
  ['Guided editing', 'Dropdowns and a plain-English preview replace formulas. Advanced users can still type one.'],
  ['Automatic 7-day test', 'See production next to your draft, day by day, with the variance before you submit.'],
  ['Reviewed before live', 'Nothing reaches production without the data team. Every version is kept, so you can roll back.'],
  ['Impact you can see', 'Know which other metrics depend on the one you are changing before you change it.'],
  ['Ready for AI agents', 'Approved metrics are exposed as tools over MCP, so an agent quotes the same number as your dashboard.'],
]

export default function Landing() {
  return (
    <div className="dark min-h-screen bg-neutral-950 text-neutral-50">
      <header className="fixed inset-x-0 top-0 z-30 border-b border-white/10 bg-neutral-950/70 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
          <Link to="/" aria-label="Semantix home"><Logo /></Link>
          <nav aria-label="Site" className="hidden items-center gap-7 text-sm text-neutral-400 md:flex">
            <a href="#how" className="hover:text-white">How it works</a>
            <a href="#features" className="hover:text-white">Features</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/login" className="btn btn-ghost">Sign in</Link>
            <Link to="/login" className="btn btn-primary">Get started</Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden pt-14">
        <div aria-hidden className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,.04)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
        <div aria-hidden className="absolute -top-24 left-1/2 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-violet-600/25 blur-[130px]" />
        <div aria-hidden className="absolute right-0 top-40 h-[300px] w-[400px] rounded-full bg-indigo-500/15 blur-[120px]" />
        <div className="relative mx-auto max-w-7xl px-6 pb-24 pt-24 text-center md:pt-32">
          <motion.span initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="badge badge-accent border border-accent-500/30 !px-3 !py-1">
            Governed metrics for people and AI agents
          </motion.span>
          <motion.h1 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
            className="mx-auto mt-6 max-w-4xl text-5xl font-bold leading-[1.05] tracking-tight md:text-7xl">
            <span className="bg-gradient-to-b from-white to-neutral-400 bg-clip-text text-transparent">One definition for every number.</span>
            <br />
            <span className="bg-gradient-to-r from-violet-300 via-accent-400 to-indigo-400 bg-clip-text text-transparent">Tested before it ships.</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }} className="mx-auto mt-6 max-w-2xl text-lg text-neutral-400">
            Semantix is the semantic layer between your warehouse and everyone who asks it questions. Define a metric once, test it, get it reviewed,
            and serve the same answer to dashboards and AI agents.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }} className="mt-9 flex flex-wrap justify-center gap-3">
            <Link to="/login" className="btn btn-primary !px-5 !py-2.5">Open the workspace <Icon name="arrow" /></Link>
            <a href="#how" className="btn btn-outline !px-5 !py-2.5">See how it works</a>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.6 }}
            className="mx-auto mt-16 max-w-3xl rounded-xl border border-white/10 bg-neutral-900/70 p-1 text-left shadow-2xl shadow-violet-950/40 backdrop-blur">
            <div className="flex items-center gap-1.5 border-b border-white/10 px-4 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-neutral-700" /><span className="h-2.5 w-2.5 rounded-full bg-neutral-700" /><span className="h-2.5 w-2.5 rounded-full bg-neutral-700" />
              <span className="type-muted ml-3">Net digital return rate</span>
              <span className="badge badge-success ml-auto">Live</span>
            </div>
            <div className="grid gap-4 p-5 md:grid-cols-2">
              <div>
                <p className="type-label-caps">What it means</p>
                <p className="mt-2 text-sm text-neutral-200">Total of items returned, divided by the total of items ordered.</p>
                <div className="mt-4 space-y-2">
                  {['Compiled and checked', 'Automatic 7-day test passed', 'Approved by the data team'].map((t) => (
                    <p key={t} className="flex items-center gap-2 text-sm text-neutral-300"><Icon name="check" className="h-4 w-4 text-emerald-400" />{t}</p>
                  ))}
                </div>
              </div>
              <div>
                <p className="type-label-caps">What the warehouse runs</p>
                <pre className="type-mono mt-2 overflow-x-auto whitespace-pre-wrap rounded-lg bg-black/50 p-3 text-violet-200">{`SELECT SUM(returned_items_count)
  / NULLIF(SUM(total_items_ordered), 0)
  AS net_return_rate
FROM fct_orders`}</pre>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section id="how" className="mx-auto max-w-7xl scroll-mt-20 px-6 py-24">
        <Reveal><p className="type-label-caps text-accent-400">How it works</p>
          <h2 className="mt-2 max-w-xl text-3xl font-bold tracking-tight md:text-4xl">From a business question to a governed number.</h2></Reveal>
        <div className="mt-12 grid gap-4 md:grid-cols-4">
          {STEPS.map(([t, d], i) => (
            <Reveal key={t} delay={i * 0.08}>
              <div className="h-full rounded-xl border border-white/10 bg-neutral-900/50 p-5">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-500/15 text-xs font-semibold text-accent-300">{i + 1}</span>
                <h3 className="mt-4 text-base font-semibold">{t}</h3>
                <p className="mt-1.5 text-sm text-neutral-400">{d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section id="features" className="mx-auto max-w-7xl scroll-mt-20 px-6 pb-24">
        <Reveal><p className="type-label-caps text-accent-400">Features</p>
          <h2 className="mt-2 max-w-xl text-3xl font-bold tracking-tight md:text-4xl">Made for the people who own the numbers.</h2></Reveal>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(([t, d], i) => (
            <Reveal key={t} delay={(i % 3) * 0.08}>
              <div className="h-full rounded-xl border border-white/10 bg-neutral-900/50 p-5 transition-colors hover:border-accent-500/40">
                <h3 className="text-base font-semibold">{t}</h3>
                <p className="mt-1.5 text-sm text-neutral-400">{d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="relative overflow-hidden border-t border-white/10">
        <div aria-hidden className="absolute left-1/2 top-0 h-[260px] w-[600px] -translate-x-1/2 rounded-full bg-violet-600/20 blur-[120px]" />
        <Reveal className="relative mx-auto max-w-3xl px-6 py-24 text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">See your workspace.</h2>
          <p className="mt-3 text-neutral-400">Browse your metrics, make a change without writing SQL, and follow it through review.</p>
          <Link to="/login" className="btn btn-primary mt-8 !px-5 !py-2.5">Get started <Icon name="arrow" /></Link>
        </Reveal>
      </section>

      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-6 py-8 text-sm text-neutral-500">
          <Logo className="text-neutral-300" />
          <p>Semantix prototype. Screens show sample data.</p>
        </div>
      </footer>
    </div>
  )
}
