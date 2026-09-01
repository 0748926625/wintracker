import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { GareProvider } from './hooks/useGare'
import { ProtectedRoute, homeForRole } from './layouts/ProtectedRoute'
import { PageLoader } from './components/ui/PageLoader'
import { AdminLayout } from './layouts/AdminLayout'
import { CompanyLayout } from './layouts/CompanyLayout'
import { DriverLayout } from './layouts/DriverLayout'

import Login from './pages/auth/Login'
import AdminDashboard from './pages/admin/Dashboard'
import AdminCompanies from './pages/admin/Companies'
import AdminDrivers from './pages/admin/Drivers'
import AdminDriverDetail from './pages/admin/DriverDetail'
import AdminPackages from './pages/admin/Packages'
import AdminPackageDetail from './pages/admin/PackageDetail'
import AdminTrash from './pages/admin/Trash'
import AdminAgents from './pages/admin/Agents'
import AdminGareAgents from './pages/admin/GareAgents'
import AdminFinance from './pages/admin/Finance'
import AdminExpenses from './pages/admin/Expenses'
import AdminBackup from './pages/admin/Backup'
import AdminBilan from './pages/admin/Bilan'
import CompanyDashboard from './pages/company/Dashboard'
import CompanyPackageDetail from './pages/company/PackageDetail'
import CompanyFinance from './pages/company/Finance'
import DriverDashboard from './pages/driver/Dashboard'
import DriverPackageDetail from './pages/driver/PackageDetail'

function Root() {
  const { session, profile, loading } = useAuth()
  if (loading) return <PageLoader />
  if (!session || !profile) return <Navigate to="/login" replace />
  return <Navigate to={homeForRole(profile.role)} replace />
}

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Root />} />
          <Route path="/login" element={<Login />} />

          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'AGENT']}>
                <GareProvider>
                  <AdminLayout />
                </GareProvider>
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="packages" element={<AdminPackages />} />
            <Route path="packages/:id" element={<AdminPackageDetail />} />
            <Route path="trash" element={<AdminTrash />} />
            <Route
              path="companies"
              element={
                <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                  <AdminCompanies />
                </ProtectedRoute>
              }
            />
            <Route
              path="drivers"
              element={
                <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                  <AdminDrivers />
                </ProtectedRoute>
              }
            />
            <Route
              path="drivers/:id"
              element={
                <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                  <AdminDriverDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="agents"
              element={
                <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                  <AdminAgents />
                </ProtectedRoute>
              }
            />
            <Route
              path="gare-agents"
              element={
                <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                  <AdminGareAgents />
                </ProtectedRoute>
              }
            />
            <Route
              path="finance"
              element={
                <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                  <AdminFinance />
                </ProtectedRoute>
              }
            />
            <Route
              path="expenses"
              element={
                <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                  <AdminExpenses />
                </ProtectedRoute>
              }
            />
            <Route
              path="backup"
              element={
                <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                  <AdminBackup />
                </ProtectedRoute>
              }
            />
          </Route>

          <Route
            path="/admin/bilan/:type/:id"
            element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                <AdminBilan />
              </ProtectedRoute>
            }
          />

          <Route
            path="/company"
            element={
              <ProtectedRoute allowedRoles={['COMPANY_USER']}>
                <CompanyLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<CompanyDashboard />} />
            <Route path="packages/:id" element={<CompanyPackageDetail />} />
            <Route path="finance" element={<CompanyFinance />} />
          </Route>

          <Route
            path="/driver"
            element={
              <ProtectedRoute allowedRoles={['DRIVER']}>
                <DriverLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DriverDashboard />} />
            <Route path="packages/:id" element={<DriverPackageDetail />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
