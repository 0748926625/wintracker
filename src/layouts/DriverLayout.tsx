import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { LogOut, KeyRound } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { ChangePasswordModal } from '../components/ChangePasswordModal'

export function DriverLayout() {
  const { signOut } = useAuth()
  const [changingPassword, setChangingPassword] = useState(false)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="flex items-center justify-between bg-brand-600 px-4 py-4 text-white">
        <span className="text-lg font-extrabold tracking-tight">WINTRACKER</span>
        <div className="flex items-center gap-3">
          <button onClick={() => setChangingPassword(true)} aria-label="Changer le mot de passe" className="p-1">
            <KeyRound className="h-6 w-6" />
          </button>
          <button onClick={signOut} aria-label="Déconnexion" className="p-1">
            <LogOut className="h-6 w-6" />
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-lg p-4 pb-8">
        <Outlet />
      </main>

      {changingPassword && <ChangePasswordModal onClose={() => setChangingPassword(false)} />}
    </div>
  )
}
