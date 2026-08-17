import { useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useMyDriver } from '../../hooks/useMyDriver'
import { useRealtimePackages } from '../../hooks/useRealtimePackages'
import { listDriverPackages } from '../../services/packages'
import { PageLoader } from '../../components/ui/PageLoader'
import { StatusBadge } from '../../components/ui/StatusBadge'

function isToday(dateStr: string) {
  const d = new Date(dateStr)
  const now = new Date()
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  )
}

export default function DriverDashboard() {
  const { profile } = useAuth()
  const { driver, loading: driverLoading } = useMyDriver()
  const fetcher = useCallback(() => listDriverPackages(driver!.id), [driver])
  const { packages, loading } = useRealtimePackages(fetcher, 'driver_id', driver?.id)

  if (driverLoading || loading) return <PageLoader />

  const aRecuperer = packages.filter((p) => p.status === 'EN_ATTENTE').length
  const enLivraison = packages.filter((p) => p.status === 'EN_LIVRAISON').length
  const livresAujourdhui = packages.filter((p) => p.status === 'LIVRE' && isToday(p.delivered_at ?? p.updated_at)).length

  const active = packages.filter((p) => p.status !== 'LIVRE' && p.status !== 'RETOUR')

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-gray-900">Bonjour {profile?.name}</h1>
      <p className="mb-5 text-gray-500">Mes colis</p>

      <div className="mb-6 grid grid-cols-3 gap-3">
        <div className="rounded-2xl bg-white p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-gray-900">{aRecuperer}</p>
          <p className="text-xs text-gray-500">À récupérer</p>
        </div>
        <div className="rounded-2xl bg-white p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-amber-600">{enLivraison}</p>
          <p className="text-xs text-gray-500">En livraison</p>
        </div>
        <div className="rounded-2xl bg-white p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-green-600">{livresAujourdhui}</p>
          <p className="text-xs text-gray-500">Livrés aujourd'hui</p>
        </div>
      </div>

      <div className="space-y-3">
        {active.map((p) => (
          <div key={p.id} className="rounded-2xl border border-gray-200 bg-white p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-bold text-gray-900">{p.tracking_number}</span>
              <StatusBadge status={p.status} />
            </div>
            <p className="font-medium text-gray-900">{p.recipient_name}</p>
            <p className="mb-3 text-sm text-gray-500">{p.delivery_address}</p>
            <Link
              to={`/driver/packages/${p.id}`}
              className="block w-full rounded-xl bg-brand-600 py-3 text-center text-sm font-bold text-white"
            >
              VOIR
            </Link>
          </div>
        ))}
        {active.length === 0 && (
          <p className="py-12 text-center text-gray-400">Aucun colis à traiter pour le moment.</p>
        )}
      </div>
    </div>
  )
}
