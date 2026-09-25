import type { PackageStatus } from '../types/database'

/**
 * Transitions autorisées, identiques à is_valid_status_transition côté base
 * (supabase/migrations/0027_retour_echec_definitif.sql) — à garder synchronisées.
 */
const TRANSITIONS: Record<PackageStatus, PackageStatus[]> = {
  EN_ATTENTE: ['RECUPERE'],
  RECUPERE: ['EN_LIVRAISON'],
  EN_LIVRAISON: ['LIVRE', 'ECHEC'],
  ECHEC: ['EN_LIVRAISON', 'RETOUR'],
  RETOUR: ['EN_LIVRAISON', 'ECHEC'],
  LIVRE: [],
}

/**
 * Chemin le plus court pour passer d'un statut à un autre (étapes intermédiaires
 * incluses, statut de départ exclu). `null` si le statut cible est inatteignable.
 */
export function statusPath(from: PackageStatus, to: PackageStatus): PackageStatus[] | null {
  const previous = new Map<PackageStatus, PackageStatus>()
  const queue: PackageStatus[] = [from]
  const seen = new Set<PackageStatus>([from])
  while (queue.length) {
    const current = queue.shift()!
    if (current === to && current !== from) break
    for (const next of TRANSITIONS[current]) {
      if (seen.has(next)) continue
      seen.add(next)
      previous.set(next, current)
      queue.push(next)
    }
  }
  if (!previous.has(to)) return null
  const path: PackageStatus[] = []
  for (let s: PackageStatus = to; s !== from; s = previous.get(s)!) path.unshift(s)
  return path
}

/**
 * Statuts atteignables depuis `from`. Un passage par ÉCHEC exige un motif :
 * RETOUR n'est donc proposé que s'il est atteignable sans nouvel échec.
 */
export function reachableStatuses(from: PackageStatus): PackageStatus[] {
  const order: PackageStatus[] = ['EN_ATTENTE', 'RECUPERE', 'EN_LIVRAISON', 'LIVRE', 'ECHEC', 'RETOUR']
  return order.filter((to) => {
    const path = statusPath(from, to)
    return path != null && (to === 'ECHEC' || !path.includes('ECHEC'))
  })
}
