// Accès en lecture à l'API REST Supabase avec la clé service_role (contourne
// les RLS), partagé par les scripts exécutés dans GitHub Actions.

export const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis.')
  process.exit(1)
}

const headers = { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}` }

// Tri stable pour la pagination, pour les tables sans colonne `id`.
const ORDER_KEYS = {
  company_commission_tiers: 'company_id,price',
  agent_companies: 'agent_profile_id',
}

// Supabase plafonne chaque réponse à 1000 lignes sans erreur : on enchaîne
// les pages jusqu'à en recevoir une incomplète.
const PAGE_SIZE = 1000

export async function fetchTable(table) {
  const order = ORDER_KEYS[table] ?? 'id'
  const rows = []
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const url = `${SUPABASE_URL}/rest/v1/${table}?select=*&order=${order}&limit=${PAGE_SIZE}&offset=${offset}`
    const res = await fetch(url, { headers })
    if (!res.ok) {
      throw new Error(`Échec de la lecture de "${table}" : ${res.status} ${await res.text()}`)
    }
    const page = await res.json()
    rows.push(...page)
    if (page.length < PAGE_SIZE) return rows
  }
}

/** Nombre exact de lignes côté base, pour vérifier que la pagination n'en perd aucune. */
export async function countTable(table) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*&limit=1`, {
    headers: { ...headers, Prefer: 'count=exact' },
  })
  if (!res.ok) throw new Error(`Échec du comptage de "${table}" : ${res.status}`)
  return Number(res.headers.get('content-range')?.split('/')[1])
}
