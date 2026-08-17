import { useEffect, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useMonthFilter } from '../../hooks/useMonthFilter'
import { listCompanyPackages } from '../../services/packages'
import { getCompany } from '../../services/companies'
import { commissionForPackage } from '../../lib/commission'
import type { Company, Package } from '../../types/database'
import { PageLoader } from '../../components/ui/PageLoader'
import { StatCard } from '../../components/ui/StatCard'
import { MonthSwitcher } from '../../components/ui/MonthSwitcher'

export default function CompanyFinance() {
  const { profile } = useAuth()
  const [company, setCompany] = useState<Company | null>(null)
  const [packages, setPackages] = useState<Package[]>([])
  const [loading, setLoading] = useState(true)
  const mf = useMonthFilter()

  useEffect(() => {
    if (!profile?.company_id) return
    getCompany(profile.company_id).then(setCompany)
    listCompanyPackages(profile.company_id)
      .then(setPackages)
      .finally(() => setLoading(false))
  }, [profile?.company_id])

  if (loading) return <PageLoader />

  const delivered = packages.filter((p) => p.status === 'LIVRE' && mf.inRange(p.created_at))
  const earnings = delivered.reduce((sum, p) => sum + (commissionForPackage(p, company) ?? 0), 0)

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Finances</h1>
        <MonthSwitcher mf={mf} />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:max-w-md">
        <StatCard label="Vos gains (F)" value={earnings} accent="text-brand-600" />
        <StatCard label="Colis livrés" value={delivered.length} />
      </div>

      <p className="mt-4 text-xs text-gray-400">
        Montants en FCFA. Vos gains correspondent à la commission qui vous est due, calculée
        uniquement sur les colis livrés avec succès du mois sélectionné.
      </p>
    </div>
  )
}
