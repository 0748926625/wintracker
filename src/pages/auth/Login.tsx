import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { Package } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { homeForRole } from '../../layouts/ProtectedRoute'
import { Field, Input } from '../../components/ui/Field'
import { Button } from '../../components/ui/Button'

export default function Login() {
  const { session, profile, signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (session && profile) {
    return <Navigate to={homeForRole(profile.role)} replace />
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error } = await signIn(email, password)
    setLoading(false)
    if (error) setError('Email ou mot de passe incorrect.')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600">
            <Package className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-brand-600">WINTRACKER</h1>
          <p className="text-xs text-gray-400">Powered by Winner Express</p>
        </div>

        <form onSubmit={handleSubmit}>
          <Field label="Email">
            <Input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Field label="Mot de passe">
            <Input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>

          {error && <p className="mb-3 text-sm font-medium text-red-600">{error}</p>}

          <Button type="submit" loading={loading} className="w-full">
            Se connecter
          </Button>
        </form>
      </div>
    </div>
  )
}
