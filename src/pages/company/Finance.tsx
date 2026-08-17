import { useEffect, useState } from 'react'
import { getCompanyFinancialSummary, type CompanyFinancialSummary } from '../../services/finance'
import { PageLoader } from '../../components/ui/PageLoader'
import { StatCard } from '../../components/ui/StatCard'

export default function CompanyFinance() {
  const [summary, setSummary] = useState<CompanyFinancialSummary | null>(null)

  useEffect(() => {
    getCompanyFinancialSummary().then(setSummary)
  }, [])

  if (!summary) return <PageLoader />

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Finances</h1>

      <div className="grid grid-cols-2 gap-3 sm:max-w-md">
        <StatCard label="Vos gains (F)" value={summary.earnings} accent="text-brand-600" />
        <StatCard label="Colis livrés" value={summary.delivered_count} />
      </div>

      <p className="mt-4 text-xs text-gray-400">
        Montants en FCFA. Vos gains correspondent à la commission qui vous est due, calculée
        uniquement sur les colis livrés avec succès.
      </p>
    </div>
  )
}
