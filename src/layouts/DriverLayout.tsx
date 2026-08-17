import { Outlet } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

export function DriverLayout() {
  const { signOut } = useAuth()

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="flex items-center justify-between bg-brand-600 px-4 py-4 text-white">
        <span className="text-lg font-extrabold tracking-tight">WINTRACKER</span>
        <button onClick={signOut} aria-label="Déconnexion" className="p-1">
          <LogOut className="h-6 w-6" />
        </button>
      </header>
      <main className="mx-auto max-w-lg p-4 pb-8">
        <Outlet />
      </main>
    </div>
  )
}
