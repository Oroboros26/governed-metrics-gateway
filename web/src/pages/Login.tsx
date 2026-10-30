import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Icon, Logo } from '../components/Icon'
import { PERSONAS, useRole } from '../lib/role'

export default function Login() {
  const go = useNavigate()
  const { setRole } = useRole()
  return (
    <div className="dark relative flex min-h-screen items-center justify-center overflow-hidden bg-neutral-950 px-6 text-neutral-50">
      <div aria-hidden className="absolute -top-32 left-1/2 h-[400px] w-[640px] -translate-x-1/2 rounded-full bg-violet-600/20 blur-[130px]" />
      <div aria-hidden className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,.035)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
      <motion.main initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} className="relative w-full max-w-md">
        <Link to="/" className="mb-8 flex justify-center" aria-label="Back to the Semantix site"><Logo className="text-lg" /></Link>
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/70 p-6 backdrop-blur">
          <h1 className="text-xl font-semibold">Sign in to Semantix</h1>
          <p className="type-page-sub">Choose who you are for this demo. In the product, your company account decides it.</p>
          <ul className="mt-5 space-y-2">
            {Object.values(PERSONAS).map((p) => (
              <li key={p.role}><button className="w-full rounded-lg border border-neutral-800 px-4 py-3 text-left transition-colors hover:border-violet-500/60 hover:bg-neutral-800/50" onClick={() => { setRole(p.role); go(p.home) }}>
                <span className="flex items-center justify-between text-sm font-medium">Continue as {p.name} <Icon name="arrow" /></span>
                <span className="mt-0.5 block text-xs text-neutral-400">{p.title}</span>
                <span className="mt-1 block text-xs text-neutral-500">{p.blurb}</span>
              </button></li>
            ))}
          </ul>
        </div>
        <p className="mt-6 text-center text-xs text-neutral-500">Prototype sign-in. Single sign-on gets connected later.</p>
        <p className="mt-2 text-center"><Link to="/" className="text-xs text-neutral-400 hover:text-white">Back to site</Link></p>
      </motion.main>
    </div>
  )
}
