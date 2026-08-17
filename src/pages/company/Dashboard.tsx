import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useRealtimePackages } from '../../hooks/useRealtimePackages'
import { listCompanyPackages } from '../../services/packages'
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
  const [search, setSearch] = useState('')

  if (loading) return <PageLoader />

  const count = (status: PackageStatus) => packages.filter((p) => p.status === status).length
  const byStatus = filter === 'TOUS' ? packages : packages.filter((p) => p.status === filter)
  const query = search.trim().toLowerCase()
  const filtered = query
    ? byStatus.filter(
        (p) =>
          p.external_reference?.toLowerCase().includes(query) ||
          p.tracking_number.toLowerCase().includes(query),
      )
    : byStatus

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-gray-900">Bonjour {profile?.name}</h1>
      <p className="mb-6 text-gray-500">Vos colis</p>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Total" value={packages.length} />
        <StatCard label="En attente" value={count('EN_ATTENTE')} />
        <StatCard label="Récupérés" value={count('RECUPERE')} />
        <StatCard label="En livraison" value={count('EN_LIVRAISON')} />
        <StatCard label="Livrés" value={count('LIVRE')} accent="text-green-600" />
        <StatCard label="Échecs" value={count('ECHEC')} accent="text-red-600" />
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

      <div className="relative mb-4 max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher par numéro de colis…"
          className="w-full rounded-xl border border-gray-300 py-2.5 pl-9 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="px-4 py-3 font-medium">N° colis</th>
              <th className="px-4 py-3 font-medium">Destinataire</th>
              <th className="hidden px-4 py-3 font-medium sm:table-cell">Adresse</th>
              <th className="hidden px-4 py-3 font-medium sm:table-cell">Prix</th>
              <th className="px-4 py-3 font-medium">Statut</th>
              <th className="hidden px-4 py-3 font-medium md:table-cell">Livreur</th>
              <th className="hidden px-4 py-3 font-medium md:table-cell">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <Link to={`/company/packages/${p.id}`} className="block font-medium text-brand-600">
                    {p.external_reference || p.tracking_number}
                  </Link>
                  {p.external_reference && (
                    <span className="text-xs text-gray-400">{p.tracking_number}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-900">{p.recipient_name}</td>
                <td className="hidden px-4 py-3 text-gray-600 sm:table-cell">{p.delivery_address}</td>
                <td className="hidden px-4 py-3 text-gray-600 sm:table-cell">
                  {p.price ? `${p.price} F` : '—'}
                </td>
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
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                  {query ? 'Aucun colis ne correspond à cette recherche.' : 'Aucun colis.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
