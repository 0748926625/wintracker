import { NavLink, Outlet } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import { LayoutDashboard, Package, Building2, Truck, Users, IdCard, Wallet, LogOut, Repeat } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useGare } from '../hooks/useGare'

interface NavLinkItem {
  to: string
  label: string
  /** Libellé compact pour la barre du bas mobile, où l'espace est limité (7 onglets côté Super Admin). */
  shortLabel?: string
  icon: LucideIcon
  end?: boolean
}

const baseLinks: NavLinkItem[] = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/packages', label: 'Colis', icon: Package },
]

const superAdminLinks: NavLinkItem[] = [
  { to: '/admin/companies', label: 'Compagnies', icon: Building2 },
  { to: '/admin/drivers', label: 'Livreurs', icon: Truck },
  { to: '/admin/agents', label: 'Agents Wintrack', shortLabel: 'Wintrack', icon: Users },
  { to: '/admin/gare-agents', label: 'Agents de gare', shortLabel: 'Gare', icon: IdCard },
  { to: '/admin/finance', label: 'Finances', icon: Wallet },
]

export function AdminLayout() {
  const { profile, signOut } = useAuth()
  const { activeCompany, canSwitch, changeGare } = useGare()
  const links = profile?.role === 'SUPER_ADMIN' ? [...baseLinks, ...superAdminLinks] : baseLinks

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="hidden w-60 flex-col border-r border-gray-200 bg-white p-4 md:flex">
        <Logo />
        {activeCompany && (
          <div className="mt-4 rounded-xl bg-brand-50 px-3 py-2">
            <p className="text-[11px] font-medium uppercase tracking-wide text-brand-600">Gare</p>
            <p className="truncate text-sm font-semibold text-brand-800">{activeCompany.name}</p>
            {canSwitch && (
              <button
                onClick={changeGare}
                className="mt-1 flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline"
              >
                <Repeat className="h-3 w-3" /> Changer
              </button>
            )}
          </div>
        )}
        <nav className="mt-8 flex flex-1 flex-col gap-1">
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive ? 'bg-brand-50 text-brand-700' : 'text-gray-600 hover:bg-gray-100'
                }`
              }
            >
              <Icon className="h-5 w-5" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-gray-200 pt-4">
          <p className="mb-2 truncate text-sm font-medium text-gray-700">{profile?.name}</p>
          <button
            onClick={signOut}
            className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-red-600"
          >
            <LogOut className="h-4 w-4" /> Déconnexion
          </button>
        </div>
      </aside>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 md:hidden">
          <div>
            <Logo compact />
            {activeCompany && (
              <button
                onClick={canSwitch ? changeGare : undefined}
                className="mt-0.5 flex items-center gap-1 text-xs font-medium text-brand-600"
              >
                {activeCompany.name}
                {canSwitch && <Repeat className="h-3 w-3" />}
              </button>
            )}
          </div>
          <button onClick={signOut} className="text-gray-500 hover:text-red-600">
            <LogOut className="h-5 w-5" />
          </button>
        </header>

        <main className="flex-1 p-4 pb-24 md:p-8 md:pb-8">
          {activeCompany && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-brand-100 bg-brand-50 px-4 py-2.5">
              <Building2 className="h-4 w-4 shrink-0 text-brand-600" />
              <p className="text-sm font-bold text-brand-800">{activeCompany.name}</p>
            </div>
          )}
          <Outlet />
        </main>

        <nav className="fixed inset-x-0 bottom-0 flex border-t border-gray-200 bg-white md:hidden">
          {links.map(({ to, label, shortLabel, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium whitespace-nowrap ${
                  isActive ? 'text-brand-600' : 'text-gray-500'
                }`
              }
            >
              <Icon className="h-5 w-5" />
              {shortLabel ?? label}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  )
}

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div>
      <span className="text-xl font-extrabold tracking-tight text-brand-600">WINTRACKER</span>
      {!compact && <p className="text-xs text-gray-400">Powered by Winner Express</p>}
    </div>
  )
}
