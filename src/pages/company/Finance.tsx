import { useEffect, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useCompanyGroup } from '../../hooks/useCompanyGroup'
import { usePeriodFilter } from '../../hooks/usePeriodFilter'
import { listCompanyPackages, listCompaniesPackages } from '../../services/packages'
import { commissionForPackage } from '../../lib/commission'
import { packageActivityDate } from '../../lib/packageDate'
import type { Package } from '../../types/database'
import { PageLoader } from '../../components/ui/PageLoader'
import { StatCard } from '../../components/ui/StatCard'
import { PeriodSwitcher } from '../../components/ui/PeriodSwitcher'

export default function CompanyFinance() {
  const { profile } = useAuth()
  const { companyIds, companyById, isMultiBranch, loading: groupLoading } = useCompanyGroup(
    profile?.company_id,
  )
  const [packages, setPackages] = useState<Package[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedBranches, setSelectedBranches] = useState<Set<string>>(new Set())
  const pf = usePeriodFilter()

  useEffect(() => {
    if (groupLoading || !profile?.company_id) return
    const fetch = companyIds.length > 1 ? listCompaniesPackages(companyIds) : listCompanyPackages(profile.company_id)
    fetch.then(setPackages).finally(() => setLoading(false))
  }, [profile?.company_id, groupLoading, companyIds])

  function toggleBranch(id: string) {
    setSelectedBranches((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  if (groupLoading || loading) return <PageLoader />

  const delivered = packages
    .filter((p) => p.status === 'LIVRE' && pf.inRange(packageActivityDate(p)))
    .filter((p) => selectedBranches.size === 0 || selectedBranches.has(p.company_id))
  const earnings = delivered.reduce(
    (sum, p) => sum + (commissionForPackage(p, companyById.get(p.company_id) ?? null) ?? 0),
    0,
  )

  const byBranch = isMultiBranch
    ? [...companyById.values()]
        .filter((c) => selectedBranches.size === 0 || selectedBranches.has(c.id))
        .map((c) => {
          const branchDelivered = delivered.filter((p) => p.company_id === c.id)
          const branchEarnings = branchDelivered.reduce(
            (sum, p) => sum + (commissionForPackage(p, c) ?? 0),
            0,
          )
          return { company: c, earnings: branchEarnings, count: branchDelivered.length }
        })
    : []

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Finances</h1>
        <PeriodSwitcher pf={pf} />
      </div>

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

      <div className="grid grid-cols-2 gap-3 sm:max-w-md">
        <StatCard label="Vos gains (F)" value={earnings} accent="text-brand-600" />
        <StatCard label="Colis livrés" value={delivered.length} />
      </div>

      <p className="mt-4 text-xs text-gray-400">
        Montants en FCFA. Vos gains correspondent à la commission qui vous est due, calculée
        uniquement sur les colis livrés avec succès de la période sélectionnée.
      </p>

      {isMultiBranch && (
        <div className="mt-8">
          <h2 className="mb-3 text-sm font-semibold text-gray-700">Détail par succursale</h2>
          <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Succursale</th>
                  <th className="px-4 py-3 font-medium">Colis livrés</th>
                  <th className="px-4 py-3 font-medium">Gains (F)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {byBranch.map(({ company, earnings, count }) => (
                  <tr key={company.id}>
                    <td className="px-4 py-3 font-medium text-gray-900">{company.name}</td>
                    <td className="px-4 py-3 text-gray-600">{count}</td>
                    <td className="px-4 py-3 text-gray-600">{earnings}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
