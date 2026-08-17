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
