import { supabase } from '../lib/supabase'

export interface AdminFinancialSummary {
  revenue: number
  commission: number
  profit: number
  delivered_count: number
}

export async function getAdminFinancialSummary(filter: {
  companyId?: string
  groupId?: string
}): Promise<AdminFinancialSummary> {
  const { data, error } = await supabase
    .rpc('financial_summary_admin', {
      p_company_id: filter.companyId ?? null,
      p_group_id: filter.groupId ?? null,
    })
    .single()
  if (error) throw error
  return data as AdminFinancialSummary
}

export interface CompanyFinancialSummary {
  earnings: number
  delivered_count: number
}

export async function getCompanyFinancialSummary(): Promise<CompanyFinancialSummary> {
  const { data, error } = await supabase.rpc('financial_summary_company').single()
  if (error) throw error
  return data as CompanyFinancialSummary
}
