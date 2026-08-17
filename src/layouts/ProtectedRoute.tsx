import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import type { UserRole } from '../types/database'
import { PageLoader } from '../components/ui/PageLoader'

export function ProtectedRoute({
  allowedRoles,
  children,
}: {
  allowedRoles: UserRole[]
  children: ReactNode
}) {
  const { session, profile, loading } = useAuth()

  if (loading) return <PageLoader />

  if (!session || !profile) return <Navigate to="/login" replace />

  if (!allowedRoles.includes(profile.role)) {
    return <Navigate to={homeForRole(profile.role)} replace />
  }

  return <>{children}</>
}

export function homeForRole(role: UserRole): string {
  switch (role) {
    case 'SUPER_ADMIN':
    case 'AGENT':
      return '/admin'
    case 'COMPANY_USER':
      return '/company'
    case 'DRIVER':
      return '/driver'
  }
}
