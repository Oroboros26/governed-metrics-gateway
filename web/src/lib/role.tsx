// The three profiles of the prototype. The role is kept in localStorage so a refresh keeps you where you were.
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { setActor } from './workflow'

export type Role = 'business' | 'analyst' | 'engineer'
export type Persona = { role: Role; name: string; title: string; blurb: string; home: string }
export const PERSONAS: Record<Role, Persona> = {
  business: { role: 'business', name: 'Jean', title: 'E-commerce · Business user', blurb: 'Asks for metrics, filters and rules, and explains the business in plain words.', home: '/app/v/d2c/overview' },
  analyst: { role: 'analyst', name: 'Noa', title: 'E-commerce · Data analyst', blurb: 'Checks what the business asks for, tests it, and sends the good ones to engineering.', home: '/app/review' },
  engineer: { role: 'engineer', name: 'Ravi', title: 'Data engineering', blurb: 'Reviews merge requests, sees every view and who works on it, manages access.', home: '/app/engineering' },
}
const read = (): Role => { try { const r = localStorage.getItem('sx-role'); if (r === 'business' || r === 'analyst' || r === 'engineer') return r } catch { /* default below */ } return 'business' }

const Ctx = createContext<{ role: Role; persona: Persona; setRole: (r: Role) => void; canEdit: boolean }>({ role: 'business', persona: PERSONAS.business, setRole: () => {}, canEdit: true })
export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, set] = useState<Role>(read)
  setActor(PERSONAS[role].name)
  useEffect(() => { try { localStorage.setItem('sx-role', role) } catch { /* not saved */ } }, [role])
  return <Ctx.Provider value={{ role, persona: PERSONAS[role], setRole: set, canEdit: role !== 'engineer' }}>{children}</Ctx.Provider>
}
export const useRole = () => useContext(Ctx)
