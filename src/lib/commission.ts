import type { Company, Package } from '../types/database'

/** Commission due à la compagnie pour ce colis, selon son mode configuré. `null` si non calculable. */
export function commissionForPackage(p: Package, company: Company | null): number | null {
  if (!company || p.status !== 'LIVRE' || p.price == null) return null
  if (company.commission_type === 'RATE') {
    return company.commission_rate != null ? Math.round((p.price * company.commission_rate) / 100) : null
  }
  if (company.commission_type === 'FIXED_PER_TIER') {
    const tier = company.commission_tiers?.find((t) => t.price === p.price)
    return tier ? tier.amount : null
  }
  return null
}
