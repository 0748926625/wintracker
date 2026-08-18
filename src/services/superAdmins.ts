import { supabase } from '../lib/supabase'
import type { Profile } from '../types/database'

export async function listSuperAdmins(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'SUPER_ADMIN')
    .order('name')
  if (error) throw error
  return data as Profile[]
}

/**
 * Promeut un profil existant (ex: un agent Wintrack) en SUPER_ADMIN. Autorisé
 * par la policy RLS `profiles_all_super_admin` (accès total pour un SUPER_ADMIN).
 */
export async function promoteToSuperAdmin(profileId: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ role: 'SUPER_ADMIN', company_id: null })
    .eq('id', profileId)
  if (error) throw error

  // Les compagnies assignées en tant qu'agent n'ont plus de sens pour un
  // SUPER_ADMIN, qui voit déjà tout.
  await supabase.from('agent_companies').delete().eq('agent_profile_id', profileId)
}
