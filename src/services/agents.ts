import { supabase } from '../lib/supabase'
import type { Company, Profile } from '../types/database'

export async function listAgents(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'AGENT')
    .order('name')
  if (error) throw error
  return data as Profile[]
}

export async function getAgentCompanies(agentProfileId: string): Promise<Company[]> {
  const { data, error } = await supabase
    .from('agent_companies')
    .select('company:companies(*)')
    .eq('agent_profile_id', agentProfileId)
  if (error) throw error
  return (data as unknown as { company: Company }[]).map((row) => row.company)
}

export async function setAgentCompanies(agentProfileId: string, companyIds: string[]): Promise<void> {
  const { error: deleteError } = await supabase
    .from('agent_companies')
    .delete()
    .eq('agent_profile_id', agentProfileId)
  if (deleteError) throw deleteError

  if (companyIds.length === 0) return

  const { error: insertError } = await supabase
    .from('agent_companies')
    .insert(companyIds.map((company_id) => ({ agent_profile_id: agentProfileId, company_id })))
  if (insertError) throw insertError
}
