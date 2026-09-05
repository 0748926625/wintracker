import type { Package } from '../types/database'

/**
 * Date à utiliser pour tout calcul de période (bilans, classements, dashboards) :
 * la date de prise en compte choisie manuellement prime sur la date de création.
 */
export function effectiveDate(pkg: Package): string {
  return pkg.count_date ?? pkg.created_at
}
