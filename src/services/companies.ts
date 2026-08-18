import { supabase } from '../lib/supabase'
import type { CommissionType, Company, CompanyCommissionTier, Profile } from '../types/database'

const COMPANY_SELECT = `*, group:company_groups(*), commission_tiers:company_commission_tiers(*)`

export async function listCompanies(): Promise<Company[]> {
  const { data, error } = await supabase.from('companies').select(COMPANY_SELECT).order('name')
  if (error) throw error
  return data as unknown as Company[]
}

export async function getCompany(id: string): Promise<Company> {
  const { data, error } = await supabase
    .from('companies')
    .select(COMPANY_SELECT)
    .eq('id', id)
    .single()
  if (error) throw error
  return data as unknown as Company
}

/**
 * Compagnies "sœurs" partageant le même groupe qu'une compagnie donnée (ex: les
 * différentes succursales d'une même compagnie), la compagnie elle-même incluse.
 * Retourne uniquement cette compagnie si elle n'appartient à aucun groupe.
 */
export async function listGroupCompanies(companyId: string): Promise<Company[]> {
  const company = await getCompany(companyId)
  if (!company.group_id) return [company]

  const { data, error } = await supabase
    .from('companies')
    .select(COMPANY_SELECT)
    .eq('group_id', company.group_id)
    .order('name')
  if (error) throw error
  return data as unknown as Company[]
}

export interface CompanyInput {
  name: string
  phone?: string
  email?: string
  address?: string
  group_id?: string | null
  commission_type?: CommissionType | null
  commission_rate?: number | null
}

export async function createCompany(input: CompanyInput): Promise<Company> {
  const { data, error } = await supabase.from('companies').insert(input).select().single()
  if (error) throw error
  return data as Company
}

export async function updateCompany(id: string, patch: Partial<CompanyInput>): Promise<Company> {
  const { data, error } = await supabase
    .from('companies')
    .update(patch)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Company
}

export async function deleteCompany(id: string): Promise<void> {
  const { error } = await supabase.from('companies').delete().eq('id', id)
  if (error) {
    if (error.code === '23503' || error.code === '23514') {
      throw new Error(
        "Impossible de supprimer : cette compagnie a des colis ou des utilisateurs associés.",
      )
    }
    throw error
  }
}

export async function setCommissionTiers(
  companyId: string,
  tiers: { price: number; amount: number }[],
): Promise<void> {
  const { error: deleteError } = await supabase
    .from('company_commission_tiers')
    .delete()
    .eq('company_id', companyId)
  if (deleteError) throw deleteError

  if (tiers.length === 0) return

  const { error: insertError } = await supabase
    .from('company_commission_tiers')
    .insert(tiers.map((t) => ({ company_id: companyId, price: t.price, amount: t.amount })))
  if (insertError) throw insertError
}

export async function getCommissionTiers(companyId: string): Promise<CompanyCommissionTier[]> {
  const { data, error } = await supabase
    .from('company_commission_tiers')
    .select('*')
    .eq('company_id', companyId)
  if (error) throw error
  return data as CompanyCommissionTier[]
}

export async function listCompanyUsers(companyId: string): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'COMPANY_USER')
    .eq('company_id', companyId)
    .order('name')
  if (error) throw error
  return data as Profile[]
}
