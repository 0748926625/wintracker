import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useRealtimePackages } from '../../hooks/useRealtimePackages'
import { listCompanyPackages } from '../../services/packages'
import { getCompanyFinancialSummary, type CompanyFinancialSummary } from '../../services/finance'
import type { PackageStatus } from '../../types/database'
import { PageLoader } from '../../components/ui/PageLoader'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { StatCard } from '../../components/ui/StatCard'

const FILTERS: { label: string; value: PackageStatus | 'TOUS' }[] = [
  { label: 'Tous', value: 'TOUS' },
  { label: 'En attente', value: 'EN_ATTENTE' },
  { label: 'Récupérés', value: 'RECUPERE' },
  { label: 'En livraison', value: 'EN_LIVRAISON' },
  { label: 'Livrés', value: 'LIVRE' },
  { label: 'Échecs', value: 'ECHEC' },
]

export default function CompanyDashboard() {
  const { profile } = useAuth()
  const fetcher = useCallback(() => listCompanyPackages(profile!.company_id!), [profile])
  const { packages, loading } = useRealtimePackages(fetcher, 'company_id', profile?.company_id)
  const [filter, setFilter] = useState<PackageStatus | 'TOUS'>('TOUS')
  const [finance, setFinance] = useState<CompanyFinancialSummary | null>(null)

  useEffect(() => {
    getCompanyFinancialSummary().then(setFinance)
  }, [])

  if (loading) return <PageLoader />

  const count = (status: PackageStatus) => packages.filter((p) => p.status === status).length
  const filtered = filter === 'TOUS' ? packages : packages.filter((p) => p.status === filter)

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-gray-900">Bonjour {profile?.name}</h1>
      <p className="mb-6 text-gray-500">Vos colis</p>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
        <StatCard label="Total" value={packages.length} />
        <StatCard label="En attente" value={count('EN_ATTENTE')} />
        <StatCard label="Récupérés" value={count('RECUPERE')} />
        <StatCard label="En livraison" value={count('EN_LIVRAISON')} />
        <StatCard label="Livrés" value={count('LIVRE')} accent="text-green-600" />
        <StatCard label="Échecs" value={count('ECHEC')} accent="text-red-600" />
        <StatCard label="Vos gains (F)" value={finance?.earnings ?? 0} accent="text-brand-600" />
      </div>

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium ${
              filter === f.value ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="px-4 py-3 font-medium">Tracking</th>
              <th className="px-4 py-3 font-medium">Destinataire</th>
              <th className="hidden px-4 py-3 font-medium sm:table-cell">Adresse</th>
              <th className="px-4 py-3 font-medium">Statut</th>
              <th className="hidden px-4 py-3 font-medium md:table-cell">Livreur</th>
              <th className="hidden px-4 py-3 font-medium md:table-cell">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <Link to={`/company/packages/${p.id}`} className="font-medium text-brand-600">
                    {p.tracking_number}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-900">{p.recipient_name}</td>
                <td className="hidden px-4 py-3 text-gray-600 sm:table-cell">{p.delivery_address}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={p.status} />
                </td>
                <td className="hidden px-4 py-3 text-gray-600 md:table-cell">
                  {p.driver?.profile?.name || '—'}
                </td>
                <td className="hidden px-4 py-3 text-gray-500 md:table-cell">
                  {new Date(p.created_at).toLocaleDateString('fr-FR')}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  Aucun colis.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
