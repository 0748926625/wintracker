import { useEffect, useMemo, useState } from 'react'
import { listGroupCompanies } from '../services/companies'
import type { Company } from '../types/database'

/**
 * Regroupe les compagnies "sœurs" (même groupe = succursales d'une même compagnie,
 * ex: UTB Yopougon + UTB Cocody) pour centraliser les infos d'un COMPANY_USER qui
 * gère plusieurs succursales. Retourne uniquement sa compagnie s'il n'y a pas de groupe.
 */
export function useCompanyGroup(companyId: string | null | undefined) {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!companyId) {
      setCompanies([])
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    listGroupCompanies(companyId)
      .then((list) => {
        if (!cancelled) setCompanies(list)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [companyId])

  const companyIds = useMemo(() => companies.map((c) => c.id), [companies])
  const companyById = useMemo(() => new Map(companies.map((c) => [c.id, c])), [companies])
  const primaryCompany = useMemo(
    () => companies.find((c) => c.id === companyId) ?? companies[0] ?? null,
    [companies, companyId],
  )
  const isMultiBranch = companies.length > 1
  const groupLabel = (isMultiBranch && primaryCompany?.group?.name) || primaryCompany?.name || null

  return { companies, companyIds, companyById, primaryCompany, isMultiBranch, groupLabel, loading }
}
