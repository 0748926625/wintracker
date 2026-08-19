import { supabase } from '../lib/supabase'
import type { CompanyGroup } from '../types/database'

export async function listCompanyGroups(): Promise<CompanyGroup[]> {
  const { data, error } = await supabase.from('company_groups').select('*').order('name')
  if (error) throw error
  return data as CompanyGroup[]
}

export async function createCompanyGroup(name: string): Promise<CompanyGroup> {
  const { data, error } = await supabase
    .from('company_groups')
    .insert({ name })
    .select()
    .single()
  if (error) throw error
  return data as CompanyGroup
}

/** Les compagnies du groupe ne sont pas supprimées : elles sont simplement détachées (group_id → null). */
export async function deleteCompanyGroup(id: string): Promise<void> {
  const { error } = await supabase.from('company_groups').delete().eq('id', id)
  if (error) throw error
}
