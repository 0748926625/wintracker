import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { LogOut, Building2, Package, Wallet } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { getCompany } from '../services/companies'
import type { Company } from '../types/database'

export function CompanyLayout() {
  const { profile, signOut } = useAuth()
  const [company, setCompany] = useState<Company | null>(null)

  useEffect(() => {
    if (profile?.company_id) getCompany(profile.company_id).then(setCompany)
  }, [profile?.company_id])

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between px-4 py-3 sm:px-8">
          <div>
            <span className="text-xl font-extrabold tracking-tight text-brand-600">WINTRACKER</span>
            <p className="text-xs text-gray-400">Powered by Winner Express</p>
          </div>
          <button
            onClick={signOut}
            className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-red-600"
          >
            <LogOut className="h-5 w-5" />
            <span className="hidden sm:inline">Déconnexion</span>
          </button>
        </div>
        {company && (
          <div className="flex items-center gap-2 border-t border-brand-100 bg-brand-50 px-4 py-2.5 sm:px-8">
            <Building2 className="h-4 w-4 text-brand-600" />
            <p className="text-sm font-bold text-brand-800">{company.name}</p>
          </div>
        )}
        <nav className="flex gap-1 px-4 sm:px-8">
          <NavLink
            to="/company"
            end
            className={({ isActive }) =>
              `flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium ${
                isActive ? 'border-brand-600 text-brand-700' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`
            }
          >
            <Package className="h-4 w-4" /> Colis
          </NavLink>
          <NavLink
            to="/company/finance"
            className={({ isActive }) =>
              `flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium ${
                isActive ? 'border-brand-600 text-brand-700' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`
            }
          >
            <Wallet className="h-4 w-4" /> Finances
          </NavLink>
        </nav>
      </header>
      <main className="mx-auto max-w-4xl p-4 sm:p-8">
        <Outlet />
      </main>
    </div>
  )
}
