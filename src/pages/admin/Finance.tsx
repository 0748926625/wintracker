import { useEffect, useState } from 'react'
import { listCompanies } from '../../services/companies'
import { listCompanyGroups } from '../../services/groups'
import { getAdminFinancialSummary, type AdminFinancialSummary } from '../../services/finance'
import type { Company, CompanyGroup } from '../../types/database'
import { PageLoader } from '../../components/ui/PageLoader'
import { StatCard } from '../../components/ui/StatCard'
import { Select } from '../../components/ui/Field'

type Scope = { type: 'ALL' } | { type: 'COMPANY'; id: string } | { type: 'GROUP'; id: string }

export default function AdminFinance() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [groups, setGroups] = useState<CompanyGroup[]>([])
  const [scope, setScope] = useState<Scope>({ type: 'ALL' })
  const [summary, setSummary] = useState<AdminFinancialSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    listCompanies().then(setCompanies)
    listCompanyGroups().then(setGroups)
  }, [])

  useEffect(() => {
    setLoading(true)
    getAdminFinancialSummary(
      scope.type === 'COMPANY'
        ? { companyId: scope.id }
        : scope.type === 'GROUP'
          ? { groupId: scope.id }
          : {},
    )
      .then(setSummary)
      .finally(() => setLoading(false))
  }, [scope])

  function handleScopeChange(value: string) {
    if (value === 'ALL') setScope({ type: 'ALL' })
    else {
      const [type, id] = value.split(':')
      setScope({ type: type as 'COMPANY' | 'GROUP', id })
    }
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Finances</h1>

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

      {loading || !summary ? (
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
        Montants en FCFA, calculés sur les colis livrés avec succès uniquement.
      </p>
    </div>
  )
}
