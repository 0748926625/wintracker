import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { Building2, LogOut } from 'lucide-react'
import { useAuth } from './useAuth'
import { getAgentCompanies } from '../services/agents'
import type { Company } from '../types/database'
import { PageLoader } from '../components/ui/PageLoader'
import { Button } from '../components/ui/Button'

interface GareContextValue {
  companies: Company[]
  activeCompany: Company | null
  activeCompanyId: string | null
  canSwitch: boolean
  changeGare: () => void
}

const GareContext = createContext<GareContextValue | undefined>(undefined)

const NON_AGENT_VALUE: GareContextValue = {
  companies: [],
  activeCompany: null,
  activeCompanyId: null,
  canSwitch: false,
  changeGare: () => {},
}

function storageKey(profileId: string) {
  return `wintracker:activeGare:${profileId}`
}

export function GareProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth()
  const isAgent = profile?.role === 'AGENT'
  const profileId = profile?.id

  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(isAgent)
  const [activeCompanyId, setActiveCompanyId] = useState<string | null>(null)

  useEffect(() => {
    if (!isAgent || !profileId) return
    let cancelled = false
    setLoading(true)
    getAgentCompanies(profileId).then((list) => {
      if (cancelled) return
      setCompanies(list)
      if (list.length === 1) {
        setActiveCompanyId(list[0].id)
      } else {
        const stored = localStorage.getItem(storageKey(profileId))
        setActiveCompanyId(stored && list.some((c) => c.id === stored) ? stored : null)
      }
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [isAgent, profileId])

  function chooseCompany(id: string) {
    if (profileId) localStorage.setItem(storageKey(profileId), id)
    setActiveCompanyId(id)
  }

  function changeGare() {
    if (profileId) localStorage.removeItem(storageKey(profileId))
    setActiveCompanyId(null)
  }

  if (!isAgent) {
    return <GareContext.Provider value={NON_AGENT_VALUE}>{children}</GareContext.Provider>
  }

  if (loading) return <PageLoader />

  if (companies.length === 0) return <NoGareScreen />

  const activeCompany = companies.find((c) => c.id === activeCompanyId) ?? null

  if (!activeCompany) {
    return <GarePicker companies={companies} onChoose={chooseCompany} />
  }

  return (
    <GareContext.Provider
      value={{
        companies,
        activeCompany,
        activeCompanyId: activeCompany.id,
        canSwitch: companies.length > 1,
        changeGare,
      }}
    >
      {children}
    </GareContext.Provider>
  )
}

export function useGare() {
  const ctx = useContext(GareContext)
  if (!ctx) throw new Error('useGare doit être utilisé dans un GareProvider')
  return ctx
}

function GarePicker({
  companies,
  onChoose,
}: {
  companies: Company[]
  onChoose: (id: string) => void
}) {
  const { signOut } = useAuth()

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6">
        <h1 className="mb-1 text-xl font-bold text-gray-900">Choisissez votre gare</h1>
        <p className="mb-5 text-sm text-gray-500">
          Sélectionnez la compagnie pour laquelle vous travaillez actuellement. Vous pourrez en
          changer à tout moment.
        </p>
        <div className="space-y-2">
          {companies.map((c) => (
            <button
              key={c.id}
              onClick={() => onChoose(c.id)}
              className="flex w-full items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 text-left font-medium text-gray-900 transition-colors hover:border-brand-400 hover:bg-brand-50"
            >
              <Building2 className="h-5 w-5 text-brand-600" />
              {c.name}
            </button>
          ))}
        </div>
        <button
          onClick={signOut}
          className="mt-6 flex w-full items-center justify-center gap-2 text-sm font-medium text-gray-500 hover:text-red-600"
        >
          <LogOut className="h-4 w-4" /> Déconnexion
        </button>
      </div>
    </div>
  )
}

function NoGareScreen() {
  const { signOut } = useAuth()

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6 text-center">
        <h1 className="mb-2 text-xl font-bold text-gray-900">Aucune compagnie assignée</h1>
        <p className="mb-5 text-sm text-gray-500">
          Aucune compagnie ne vous a encore été assignée. Contactez un administrateur pour pouvoir
          accéder aux colis.
        </p>
        <Button variant="secondary" onClick={signOut} className="w-full">
          <LogOut className="h-4 w-4" /> Déconnexion
        </Button>
      </div>
    </div>
  )
}
