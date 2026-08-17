import { supabase } from '../lib/supabase'
import type { Profile } from '../types/database'

export async function listAgents(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'AGENT')
    .order('name')
  if (error) throw error
  return data as Profile[]
}
