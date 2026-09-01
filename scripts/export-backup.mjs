#!/usr/bin/env node
// Génère une sauvegarde JSON complète des données métier WINTRACKER.
// Utilisé par .github/workflows/backup.yml (exécution planifiée), avec la
// clé service_role (accès complet, contourne les RLS) fournie via variable
// d'environnement — jamais commitée.
import fs from 'node:fs'

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis.')
  process.exit(1)
}

// Les comptes de connexion (auth.users) ne sont pas exportables via l'API
// REST et ne sont donc pas inclus — cette sauvegarde couvre les données
// métier, pas les identifiants.
const TABLES = [
  'companies',
  'company_groups',
  'company_commission_tiers',
  'profiles',
  'drivers',
  'agent_companies',
  'gare_agents',
  'packages',
  'package_events',
  'delivery_proofs',
  'expenses',
]

const headers = { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}` }

async function main() {
  const tables = {}
  const counts = {}

  for (const table of TABLES) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*`, { headers })
    if (!res.ok) {
      throw new Error(`Échec de l'export de "${table}" : ${res.status} ${await res.text()}`)
    }
    const data = await res.json()
    tables[table] = data
    counts[table] = data.length
  }

  const generatedAt = new Date()
  const dateStr = generatedAt.toISOString().slice(0, 10)
  const result = { generated_at: generatedAt.toISOString(), tables, counts }

  const outPath = `wintracker-sauvegarde-${dateStr}.json`
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2))

  const total = Object.values(counts).reduce((sum, n) => sum + n, 0)
  const summaryLines = [
    `Sauvegarde automatique WINTRACKER — ${dateStr}`,
    '',
    `${total} enregistrement(s) au total :`,
    ...Object.entries(counts).map(([t, n]) => `- ${t} : ${n}`),
    '',
    "Les comptes de connexion (emails, mots de passe) ne sont pas inclus dans cette sauvegarde.",
  ]
  fs.writeFileSync('backup-summary.txt', summaryLines.join('\n'))

  console.log(`Sauvegarde écrite : ${outPath} (${total} enregistrements)`)

  if (process.env.GITHUB_ENV) {
    fs.appendFileSync(process.env.GITHUB_ENV, `BACKUP_FILE=${outPath}\nBACKUP_DATE=${dateStr}\n`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
