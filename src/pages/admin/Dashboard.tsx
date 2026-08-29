import { useCallback, useEffect, useState } from 'react'
import { Package, Clock, PackageCheck, Truck, CheckCircle2, XCircle, RotateCcw } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useRealtimePackages } from '../../hooks/useRealtimePackages'
import { useGare } from '../../hooks/useGare'
import { usePeriodFilter } from '../../hooks/usePeriodFilter'
import { listAllPackages, listCompanyPackages } from '../../services/packages'
import { listCompanies } from '../../services/companies'
import { StatCard } from '../../components/ui/StatCard'
import { PageLoader } from '../../components/ui/PageLoader'
import { Select } from '../../components/ui/Field'
import { PeriodSwitcher } from '../../components/ui/PeriodSwitcher'
import type { Company, PackageStatus } from '../../types/database'

export default function AdminDashboard() {
  const { profile } = useAuth()
  const { activeCompanyId: gareCompanyId } = useGare()
  const isSuperAdmin = profile?.role === 'SUPER_ADMIN'

  const [companies, setCompanies] = useState<Company[]>([])
  const [selectedCompanyId, setSelectedCompanyId] = useState('ALL')

  useEffect(() => {
    if (isSuperAdmin) listCompanies().then(setCompanies)
  }, [isSuperAdmin])

  const activeCompanyId = isSuperAdmin
    ? selectedCompanyId === 'ALL'
      ? null
      : selectedCompanyId
    : gareCompanyId

  const fetcher = useCallback(
    () => (activeCompanyId ? listCompanyPackages(activeCompanyId) : listAllPackages()),
    [activeCompanyId],
  )
  const { packages, loading } = useRealtimePackages(
    fetcher,
    activeCompanyId ? 'company_id' : 'all',
    activeCompanyId ?? 'all',
  )

  const pf = usePeriodFilter()

  if (loading) return <PageLoader />

  const scoped = packages.filter((p) => pf.inRange(p.created_at))
  const count = (status: PackageStatus) => scoped.filter((p) => p.status === status).length

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {isSuperAdmin && (
            <Select
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              className="sm:max-w-xs"
            >
              <option value="ALL">Toutes les compagnies</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          )}
          <PeriodSwitcher pf={pf} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard label="Total colis" value={scoped.length} icon={Package} />
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
