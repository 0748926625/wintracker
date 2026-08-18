import type { Profile } from '../types/database'

const ROLE_SUFFIX: Partial<Record<Profile['role'], string>> = {
  AGENT: 'Agent Wintrack',
  SUPER_ADMIN: 'Super Admin',
}

/** Nom (+ rôle) de la personne ayant enregistré le colis, ou null si inconnu (colis créé avant ce suivi). */
export function creatorLabel(creator?: Profile | null): string | null {
  if (!creator) return null
  const suffix = ROLE_SUFFIX[creator.role]
  return suffix ? `${creator.name} (${suffix})` : creator.name
}
