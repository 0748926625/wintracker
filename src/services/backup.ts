import { supabase } from '../lib/supabase'

/**
 * Tables exportées pour la sauvegarde. Les comptes de connexion (auth.users,
 * mots de passe) ne sont pas accessibles côté client et ne sont donc pas
 * inclus — cette sauvegarde couvre les données métier, pas les identifiants.
 */
const BACKUP_TABLES = [
  'companies',
  'company_groups',
  'company_commission_tiers',
  'profiles',
  'drivers',
  'agent_companies',
  'gare_agents',
  'packages',
  'package_events',
  'delivery_proofs',
  'expenses',
] as const

export interface BackupResult {
  generated_at: string
  tables: Record<string, unknown[]>
  counts: Record<string, number>
}

export async function exportAllData(): Promise<BackupResult> {
  const tables: Record<string, unknown[]> = {}
  const counts: Record<string, number> = {}

  for (const table of BACKUP_TABLES) {
    const { data, error } = await supabase.from(table).select('*')
    if (error) throw new Error(`Échec de l'export de "${table}" : ${error.message}`)
    tables[table] = data ?? []
    counts[table] = data?.length ?? 0
  }

  return { generated_at: new Date().toISOString(), tables, counts }
}
