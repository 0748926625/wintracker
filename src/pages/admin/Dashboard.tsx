import { useCallback } from 'react'
import { Package, Clock, PackageCheck, Truck, CheckCircle2, XCircle, RotateCcw } from 'lucide-react'
import { useRealtimePackages } from '../../hooks/useRealtimePackages'
import { listAllPackages } from '../../services/packages'
import { StatCard } from '../../components/ui/StatCard'
import { PageLoader } from '../../components/ui/PageLoader'
import type { PackageStatus } from '../../types/database'

export default function AdminDashboard() {
  const fetcher = useCallback(() => listAllPackages(), [])
  const { packages, loading } = useRealtimePackages(fetcher, 'all', 'all')

  if (loading) return <PageLoader />

  const count = (status: PackageStatus) => packages.filter((p) => p.status === status).length

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Dashboard</h1>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard label="Total colis" value={packages.length} icon={Package} />
        <StatCard label="En attente" value={count('EN_ATTENTE')} icon={Clock} />
        <StatCard label="Récupérés" value={count('RECUPERE')} icon={PackageCheck} />
        <StatCard label="En livraison" value={count('EN_LIVRAISON')} icon={Truck} />
        <StatCard
          label="Livrés"
          value={count('LIVRE')}
          icon={CheckCircle2}
          accent="text-green-600"
        />
        <StatCard label="Échecs" value={count('ECHEC')} icon={XCircle} accent="text-red-600" />
        <StatCard label="Retours" value={count('RETOUR')} icon={RotateCcw} />
      </div>
    </div>
  )
}
