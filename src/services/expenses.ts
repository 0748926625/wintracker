import { supabase } from '../lib/supabase'
import type { Expense, ExpenseCategory } from '../types/database'

export async function listExpenses(): Promise<Expense[]> {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .order('expense_date', { ascending: false })
  if (error) throw error
  return data as Expense[]
}

export interface CreateExpenseInput {
  category: ExpenseCategory
  label: string
  amount: number
  is_recurring: boolean
  expense_date: string
}

export async function createExpense(input: CreateExpenseInput): Promise<Expense> {
  const { data, error } = await supabase.from('expenses').insert(input).select().single()
  if (error) throw error
  return data as Expense
}

/** Arrête une charge récurrente à partir d'aujourd'hui (les mois déjà passés restent comptés). */
export async function stopRecurringExpense(id: string): Promise<void> {
  const { error } = await supabase
    .from('expenses')
    .update({ recurrence_end: new Date().toISOString().slice(0, 10) })
    .eq('id', id)
  if (error) throw error
}

export async function deleteExpense(id: string): Promise<void> {
  const { error } = await supabase.from('expenses').delete().eq('id', id)
  if (error) throw error
}
