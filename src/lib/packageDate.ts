import type { Package } from '../types/database'

/**
 * Date pertinente d'un colis pour le filtrage par période : date de livraison
 * pour les colis livrés, dernier changement de statut pour les échecs/retours,
 * date de création sinon. Évite qu'un colis livré aujourd'hui mais créé hier
 * disparaisse des vues filtrées sur "aujourd'hui".
 */
export function packageActivityDate(p: Package): string {
  if (p.status === 'LIVRE') return p.delivered_at ?? p.updated_at
  if (p.status === 'ECHEC' || p.status === 'RETOUR') return p.updated_at
  return p.created_at
}
