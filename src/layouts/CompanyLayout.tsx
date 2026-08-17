import { Outlet } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

export function CompanyLayout() {
  const { signOut } = useAuth()

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 sm:px-8">
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
      </header>
      <main className="mx-auto max-w-4xl p-4 sm:p-8">
        <Outlet />
      </main>
    </div>
  )
}
