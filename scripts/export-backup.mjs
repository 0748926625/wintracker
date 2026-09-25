#!/usr/bin/env node
// Génère une sauvegarde JSON complète des données métier WINTRACKER.
// Utilisé par .github/workflows/backup.yml (exécution planifiée), avec la
// clé service_role (accès complet, contourne les RLS) fournie via variable
// d'environnement — jamais commitée.
import fs from 'node:fs'
import { countTable, fetchTable } from './supabase-rest.mjs'

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

async function main() {
  const tables = {}
  const counts = {}
  const warnings = []

  for (const table of TABLES) {
    const data = await fetchTable(table)
    const expected = await countTable(table)
    // Un écart peut venir d'une saisie pendant l'export ; on le signale sans bloquer l'envoi.
    if (data.length !== expected) {
      warnings.push(`⚠ ${table} : ${data.length} lignes exportées, ${expected} en base au moment du contrôle`)
    }
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
    ...(warnings.length ? [...warnings, ''] : []),
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
