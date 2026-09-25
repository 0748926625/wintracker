import { createClient, type PostgrestError } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Variables VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY manquantes. Copiez .env.example vers .env et renseignez-les.',
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

const PAGE_SIZE = 1000

/**
 * Supabase (PostgREST) plafonne chaque réponse à 1000 lignes, sans erreur :
 * au-delà, les lignes suivantes sont silencieusement ignorées. On enchaîne donc
 * les pages jusqu'à en recevoir une incomplète.
 * `buildQuery` doit reconstruire la requête à chaque appel et la trier de façon
 * stable (terminer par `.order('id')`) pour ne sauter ni dupliquer de lignes.
 */
export async function fetchAll<T>(
  buildQuery: () => {
    range: (
      from: number,
      to: number,
    ) => PromiseLike<{ data: T[] | null; error: PostgrestError | null }>
  },
): Promise<T[]> {
  const rows: T[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await buildQuery().range(from, from + PAGE_SIZE - 1)
    if (error) throw error
    rows.push(...(data ?? []))
    if (!data || data.length < PAGE_SIZE) return rows
  }
}
