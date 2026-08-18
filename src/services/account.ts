import { supabase } from '../lib/supabase'

/**
 * Change le mot de passe de l'utilisateur connecté. Re-authentifie d'abord
 * avec le mot de passe actuel (Supabase ne le vérifie pas côté updateUser :
 * une session active suffit) pour éviter qu'une session laissée ouverte
 * permette de changer le mot de passe sans le connaître.
 */
export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  const { data: sessionData } = await supabase.auth.getSession()
  const email = sessionData.session?.user.email
  if (!email) throw new Error('Session expirée, reconnectez-vous.')

  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email,
    password: currentPassword,
  })
  if (reauthError) throw new Error('Mot de passe actuel incorrect.')

  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw error
}
