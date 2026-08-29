import { useEffect, useMemo, useState } from 'react'
import { listCompanies } from '../../services/companies'
import { listCompanyGroups } from '../../services/groups'
import { listAllPackages } from '../../services/packages'
import { commissionForPackage } from '../../lib/commission'
import { usePeriodFilter } from '../../hooks/usePeriodFilter'
import type { Company, CompanyGroup, Package } from '../../types/database'
import { PageLoader } from '../../components/ui/PageLoader'
import { StatCard } from '../../components/ui/StatCard'
import { Select } from '../../components/ui/Field'
import { PeriodSwitcher } from '../../components/ui/PeriodSwitcher'

type Scope = { type: 'ALL' } | { type: 'COMPANY'; id: string } | { type: 'GROUP'; id: string }

export default function AdminFinance() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [groups, setGroups] = useState<CompanyGroup[]>([])
  const [packages, setPackages] = useState<Package[]>([])
  const [scope, setScope] = useState<Scope>({ type: 'ALL' })
  const [loading, setLoading] = useState(true)
  const pf = usePeriodFilter()

  useEffect(() => {
    listCompanies().then(setCompanies)
    listCompanyGroups().then(setGroups)
    listAllPackages()
      .then(setPackages)
      .finally(() => setLoading(false))
  }, [])

  function handleScopeChange(value: string) {
    if (value === 'ALL') setScope({ type: 'ALL' })
    else {
      const [type, id] = value.split(':')
      setScope({ type: type as 'COMPANY' | 'GROUP', id })
    }
  }

  const summary = useMemo(() => {
    const companyById = new Map(companies.map((c) => [c.id, c]))
    const scopedCompanyIds =
      scope.type === 'ALL'
        ? null
        : scope.type === 'COMPANY'
          ? new Set([scope.id])
          : new Set(companies.filter((c) => c.group_id === scope.id).map((c) => c.id))

    let revenue = 0
    let commission = 0
    let delivered = 0
    for (const p of packages) {
      if (p.status !== 'LIVRE' || p.price == null) continue
      if (!pf.inRange(p.created_at)) continue
      if (scopedCompanyIds && !scopedCompanyIds.has(p.company_id)) continue
      const company = companyById.get(p.company_id) ?? null
      revenue += p.price
      commission += commissionForPackage(p, company) ?? 0
      delivered += 1
    }
    return { revenue, commission, profit: revenue - commission, delivered_count: delivered }
  }, [packages, companies, scope, pf])

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Finances</h1>
        <PeriodSwitcher pf={pf} />
      </div>

      <div className="mb-6 max-w-xs">
        <Select
          value={scope.type === 'ALL' ? 'ALL' : `${scope.type}:${scope.id}`}
          onChange={(e) => handleScopeChange(e.target.value)}
        >
          <option value="ALL">Toutes les compagnies</option>
          {groups.length > 0 && (
            <optgroup label="Groupes">
              {groups.map((g) => (
                <option key={g.id} value={`GROUP:${g.id}`}>
                  {g.name}
                </option>
              ))}
            </optgroup>
          )}
          <optgroup label="Compagnies">
            {companies.map((c) => (
              <option key={c.id} value={`COMPANY:${c.id}`}>
                {c.name}
              </option>
            ))}
          </optgroup>
        </Select>
      </div>

      {loading ? (
        <PageLoader />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Chiffre d'affaires" value={summary.revenue} />
          <StatCard label="Commissions versées" value={summary.commission} />
          <StatCard label="Bénéfice" value={summary.profit} accent="text-green-600" />
          <StatCard label="Colis livrés" value={summary.delivered_count} />
        </div>
      )}
      <p className="mt-4 text-xs text-gray-400">
        Montants en FCFA, calculés sur les colis livrés avec succès de la période sélectionnée uniquement.
      </p>
    </div>
  )
}
