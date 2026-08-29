import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useCompanyGroup } from '../../hooks/useCompanyGroup'
import { useRealtimePackages } from '../../hooks/useRealtimePackages'
import { usePeriodFilter } from '../../hooks/usePeriodFilter'
import { listCompanyPackages, listCompaniesPackages } from '../../services/packages'
import { commissionForPackage } from '../../lib/commission'
import type { PackageStatus } from '../../types/database'
import { PageLoader } from '../../components/ui/PageLoader'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { StatCard } from '../../components/ui/StatCard'
import { PeriodSwitcher } from '../../components/ui/PeriodSwitcher'

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
  const { companyIds, companyById, isMultiBranch, loading: groupLoading } = useCompanyGroup(
    profile?.company_id,
  )
  const fetcher = useCallback(
    () =>
      companyIds.length > 1
        ? listCompaniesPackages(companyIds)
        : listCompanyPackages(profile!.company_id!),
    [profile, companyIds],
  )
  const { packages, loading } = useRealtimePackages(
    fetcher,
    isMultiBranch ? 'all' : 'company_id',
    isMultiBranch ? 'all' : profile?.company_id,
  )
  const [filter, setFilter] = useState<PackageStatus | 'TOUS'>('TOUS')
  const [selectedBranches, setSelectedBranches] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const pf = usePeriodFilter()

  function toggleBranch(id: string) {
    setSelectedBranches((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  if (groupLoading || loading) return <PageLoader />

  const scoped = packages
    .filter((p) => pf.inRange(p.created_at))
    .filter((p) => selectedBranches.size === 0 || selectedBranches.has(p.company_id))
  const count = (status: PackageStatus) => scoped.filter((p) => p.status === status).length
  const earnings = scoped.reduce(
    (sum, p) => sum + (commissionForPackage(p, companyById.get(p.company_id) ?? null) ?? 0),
    0,
  )
  const byStatus = filter === 'TOUS' ? scoped : scoped.filter((p) => p.status === filter)
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
      <div className="mb-1 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Bonjour {profile?.name}</h1>
        <PeriodSwitcher pf={pf} />
      </div>
      <p className="mb-6 text-gray-500">Vos colis</p>

      {isMultiBranch && (
        <div className="mb-4 flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedBranches(new Set())}
            className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-sm font-medium ${
              selectedBranches.size === 0
                ? 'border-brand-600 bg-brand-600 text-white'
                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
            }`}
          >
            Toutes les succursales
          </button>
          {[...companyById.values()].map((c) => (
            <button
              key={c.id}
              onClick={() => toggleBranch(c.id)}
              className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-sm font-medium ${
                selectedBranches.has(c.id)
                  ? 'border-brand-600 bg-brand-50 text-brand-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
        <StatCard label="Total" value={scoped.length} />
        <StatCard label="En attente" value={count('EN_ATTENTE')} />
        <StatCard label="Récupérés" value={count('RECUPERE')} />
        <StatCard label="En livraison" value={count('EN_LIVRAISON')} />
        <StatCard label="Livrés" value={count('LIVRE')} accent="text-green-600" />
        <StatCard label="Échecs" value={count('ECHEC')} accent="text-red-600" />
        <StatCard label="Vos gains (F)" value={earnings} accent="text-brand-600" />
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

      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
        <table className="w-full min-w-[880px] text-left text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="px-4 py-3 font-medium">Code colis</th>
              {isMultiBranch && <th className="px-4 py-3 font-medium">Succursale</th>}
              <th className="px-4 py-3 font-medium">Destinataire</th>
              <th className="px-4 py-3 font-medium">Adresse</th>
              <th className="px-4 py-3 font-medium">Prix</th>
              <th className="px-4 py-3 font-medium">Commission par colis</th>
              <th className="px-4 py-3 font-medium">Statut</th>
              <th className="px-4 py-3 font-medium">Livreur</th>
              <th className="px-4 py-3 font-medium">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <Link to={`/company/packages/${p.id}`} className="block font-medium text-brand-600">
                    {p.external_reference || p.tracking_number}
                  </Link>
                </td>
                {isMultiBranch && (
                  <td className="px-4 py-3 text-gray-600">
                    {companyById.get(p.company_id)?.name || '—'}
                  </td>
                )}
                <td className="px-4 py-3 text-gray-900">{p.recipient_name}</td>
                <td className="px-4 py-3 text-gray-600">{p.delivery_address}</td>
                <td className="px-4 py-3 text-gray-600">{p.price ? `${p.price} F` : '—'}</td>
                <td className="px-4 py-3 text-gray-600">
                  {(() => {
                    const commission = commissionForPackage(p, companyById.get(p.company_id) ?? null)
                    return commission != null ? `${commission} F` : '—'
                  })()}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={p.status} />
                </td>
                <td className="px-4 py-3 text-gray-600">{p.driver?.profile?.name || '—'}</td>
                <td className="px-4 py-3 text-gray-500">
                  {new Date(p.created_at).toLocaleDateString('fr-FR')}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={isMultiBranch ? 9 : 8} className="px-4 py-8 text-center text-gray-400">
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
