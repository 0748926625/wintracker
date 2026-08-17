import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export interface CreateUserInput {
  email: string
  password: string
  name: string
  phone?: string
  role: 'COMPANY_USER' | 'DRIVER' | 'AGENT'
  company_id?: string
}

export async function createUser(input: CreateUserInput): Promise<void> {
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData.session?.access_token
  if (!token) throw new Error('Session expirée, reconnectez-vous.')

  const { error } = await supabase.functions.invoke('admin-create-user', {
    body: input,
    headers: { Authorization: `Bearer ${token}` },
  })
  if (error) throw new Error(await extractErrorMessage(error))
}

export async function deleteUser(userId: string): Promise<void> {
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData.session?.access_token
  if (!token) throw new Error('Session expirée, reconnectez-vous.')

  const { error } = await supabase.functions.invoke('admin-create-user', {
    method: 'DELETE',
    body: { user_id: userId },
    headers: { Authorization: `Bearer ${token}` },
  })
  if (error) throw new Error(await extractErrorMessage(error))
}

async function extractErrorMessage(error: unknown): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.json()
      if (body?.error) return body.error
    } catch {
      // corps non-JSON, on retombe sur le message générique
    }
  }
  return error instanceof Error ? error.message : 'Erreur inconnue'
}
