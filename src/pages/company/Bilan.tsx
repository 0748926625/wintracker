import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Printer } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useCompanyGroup } from '../../hooks/useCompanyGroup'
import { usePeriodFilter } from '../../hooks/usePeriodFilter'
import { listCompanyPackages, listCompaniesPackages } from '../../services/packages'
import { commissionForPackage } from '../../lib/commission'
import { effectiveDate } from '../../lib/packageDate'
import type { Package } from '../../types/database'
import { PageLoader } from '../../components/ui/PageLoader'
import { StatCard } from '../../components/ui/StatCard'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { Button } from '../../components/ui/Button'
import { PeriodSwitcher } from '../../components/ui/PeriodSwitcher'

export default function CompanyBilan() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const { companies, companyIds, companyById, isMultiBranch, groupLabel, loading: groupLoading } =
    useCompanyGroup(profile?.company_id)
  const pf = usePeriodFilter()

  const [packages, setPackages] = useState<Package[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (groupLoading || companyIds.length === 0) return
    setLoading(true)
    const fetch =
      companyIds.length > 1 ? listCompaniesPackages(companyIds) : listCompanyPackages(companyIds[0])
    fetch.then(setPackages).finally(() => setLoading(false))
  }, [groupLoading, companyIds])

  if (groupLoading || loading) return <PageLoader />

  const period = packages.filter((p) => pf.inRange(effectiveDate(p)))
  const livres = period.filter((p) => p.status === 'LIVRE')
  const earnings = livres.reduce(
    (sum, p) => sum + (commissionForPackage(p, companyById.get(p.company_id) ?? null) ?? 0),
    0,
  )

  const byBranch = isMultiBranch
    ? companies.map((c) => {
        const branchDelivered = livres.filter((p) => p.company_id === c.id)
        const branchEarnings = branchDelivered.reduce(
          (sum, p) => sum + (commissionForPackage(p, c) ?? 0),
          0,
        )
        return { company: c, count: branchDelivered.length, earnings: branchEarnings }
      })
    : []

  return (
    <div className="mx-auto min-h-screen max-w-4xl bg-white p-6 print:p-0">
      <div className="no-print mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" /> Retour
        </button>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <PeriodSwitcher pf={pf} />
          <Button onClick={() => window.print()} className="w-full sm:w-auto">
            <Printer className="h-4 w-4" /> Imprimer
          </Button>
        </div>
      </div>

      <div className="mb-6 border-b border-gray-200 pb-4">
        <p className="text-lg font-extrabold tracking-tight text-brand-600">WINTRACKER</p>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">
          Bilan — {groupLabel ?? profile?.name}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Période : {pf.label} · Généré le {new Date().toLocaleDateString('fr-FR')}
        </p>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Total colis" value={period.length} />
        <StatCard label="Colis livrés" value={livres.length} accent="text-green-600" />
        <StatCard label="Vos gains (F)" value={earnings} accent="text-brand-600" />
      </div>

      {isMultiBranch && (
        <div className="mb-8">
          <h2 className="mb-3 text-sm font-semibold text-gray-700">Détail par succursale</h2>
          <div className="overflow-x-auto rounded-2xl border border-gray-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Succursale</th>
                  <th className="px-4 py-3 font-medium">Colis livrés</th>
                  <th className="px-4 py-3 font-medium">Gains (F)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {byBranch.map(({ company, count, earnings: branchEarnings }) => (
                  <tr key={company.id}>
                    <td className="px-4 py-3 font-medium text-gray-900">{company.name}</td>
                    <td className="px-4 py-3 text-gray-600">{count}</td>
                    <td className="px-4 py-3 text-gray-600">{branchEarnings}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-gray-200">
        <table className="w-full min-w-[600px] text-left text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="px-4 py-3 font-medium">Code colis</th>
              {isMultiBranch && <th className="px-4 py-3 font-medium">Succursale</th>}
              <th className="px-4 py-3 font-medium">Destinataire</th>
              <th className="px-4 py-3 font-medium">Prix</th>
              <th className="px-4 py-3 font-medium">Statut</th>
              <th className="px-4 py-3 font-medium">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {period.map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-3 font-medium text-gray-900">
                  {p.external_reference || p.tracking_number}
                </td>
                {isMultiBranch && (
                  <td className="px-4 py-3 text-gray-600">
                    {companyById.get(p.company_id)?.name ?? '—'}
                  </td>
                )}
                <td className="px-4 py-3 text-gray-900">{p.recipient_name}</td>
                <td className="px-4 py-3 text-gray-600">{p.price ? `${p.price} F` : '—'}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={p.status} />
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {new Date(effectiveDate(p)).toLocaleDateString('fr-FR')}
                </td>
              </tr>
            ))}
            {period.length === 0 && (
              <tr>
                <td colSpan={isMultiBranch ? 6 : 5} className="px-4 py-8 text-center text-gray-400">
                  Aucun colis sur cette période.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
