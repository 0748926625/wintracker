import { supabase } from '../lib/supabase'
import type { GareAgent } from '../types/database'

export async function listGareAgents(): Promise<GareAgent[]> {
  const { data, error } = await supabase.from('gare_agents').select('*').order('name')
  if (error) throw error
  return data as GareAgent[]
}

export async function createGareAgent(input: { name: string; phone?: string }): Promise<GareAgent> {
  const { data, error } = await supabase
    .from('gare_agents')
    .insert({ name: input.name, phone: input.phone || null })
    .select()
    .single()
  if (error) throw error
  return data as GareAgent
}

/** Les colis déjà associés à cet agent conservent leur historique (agent_id passe à null). */
export async function deleteGareAgent(id: string): Promise<void> {
  const { error } = await supabase.from('gare_agents').delete().eq('id', id)
  if (error) throw error
}
