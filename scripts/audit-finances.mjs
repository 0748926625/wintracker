#!/usr/bin/env node
// Audit indépendant des chiffres WINTRACKER : relit toutes les données brutes
// (clé service_role, sans RLS ni limite de 1000 lignes) et recalcule les
// indicateurs affichés par l'application, sans réutiliser son code, afin de
// pouvoir les comparer écran par écran. Liste aussi les données qui faussent
// silencieusement les calculs (commission non calculable, prix manquant...).
// Utilisé par .github/workflows/audit.yml — résultat dans le résumé du run.
import fs from 'node:fs'
import { countTable, fetchTable } from './supabase-rest.mjs'

const MAX_LIST = 25

const fmt = (n) => Math.round(n).toLocaleString('fr-FR').replace(/ | /g, ' ')
const pad = (n) => String(n).padStart(2, '0')
const monthKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
const monthLabel = (key) => {
  const [y, m] = key.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
}
const monthBounds = (key) => {
  const [y, m] = key.split('-').map(Number)
  return { start: new Date(y, m - 1, 1, 0, 0, 0), end: new Date(y, m, 0, 23, 59, 59) }
}
const dateFr = (iso) => (iso ? new Date(iso).toLocaleDateString('fr-FR') : '—')

const out = []
const line = (s = '') => out.push(s)
const table = (headers, rows) => {
  line(`| ${headers.join(' | ')} |`)
  line(`| ${headers.map((_, i) => (i === 0 ? '---' : '---:')).join(' | ')} |`)
  for (const r of rows) line(`| ${r.join(' | ')} |`)
  line()
}
const listSample = (items, render) => {
  for (const it of items.slice(0, MAX_LIST)) line(`- ${render(it)}`)
  if (items.length > MAX_LIST) line(`- … et ${items.length - MAX_LIST} autre(s)`)
  line()
}

// --- Règles métier, réécrites indépendamment de src/lib -----------------------

/** Date de rattachement à une période : date de prise en compte, sinon date de création. */
const effectiveDate = (p) => new Date(p.count_date ?? p.created_at)

/** Commission due à la compagnie + raison si elle n'est pas calculable (comptée 0 par l'app). */
function commission(p, company, tiersByCompany) {
  if (!company) return { amount: 0, issue: 'compagnie introuvable' }
  if (company.commission_type === 'RATE') {
    if (company.commission_rate == null) return { amount: 0, issue: 'taux de commission non renseigné' }
    return { amount: Math.round((p.price * Number(company.commission_rate)) / 100) }
  }
  if (company.commission_type === 'FIXED_PER_TIER') {
    const tier = tiersByCompany.get(company.id)?.get(p.price)
    if (tier == null) return { amount: 0, issue: `aucun palier défini pour le prix ${p.price} F` }
    return { amount: tier }
  }
  return { amount: 0, issue: 'aucun mode de commission configuré' }
}

function parseDay(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Montant d'une dépense imputable à [start, end] (ponctuelle ou échéances récurrentes). */
function expenseInRange(e, start, end) {
  const anchor = parseDay(e.expense_date)
  if (!e.is_recurring) return anchor >= start && anchor <= end ? Number(e.amount) : 0
  const stop = e.recurrence_end ? parseDay(e.recurrence_end) : null
  const last = stop && stop < end ? stop : end
  let n = 0
  if (e.recurrence_frequency === 'WEEKLY') {
    for (const d = new Date(anchor); d <= last; d.setDate(d.getDate() + 7)) if (d >= start) n++
  } else {
    const day = anchor.getDate()
    for (let y = anchor.getFullYear(), m = anchor.getMonth(); new Date(y, m, 1) <= last; m++) {
      const occ = new Date(y, m, Math.min(day, new Date(y, m + 1, 0).getDate()))
      if (occ >= anchor && occ >= start && occ <= last) n++
    }
  }
  return n * Number(e.amount)
}

// --- Audit ----------------------------------------------------------------------

async function main() {
  const names = ['companies', 'company_groups', 'company_commission_tiers', 'drivers', 'profiles', 'gare_agents', 'packages', 'package_events', 'expenses']
  const data = {}
  const integrity = []
  for (const t of names) {
    data[t] = await fetchTable(t)
    const expected = await countTable(t)
    integrity.push([t, fmt(data[t].length), fmt(expected), data[t].length === expected ? '✅' : '❌'])
  }

  const companyById = new Map(data.companies.map((c) => [c.id, c]))
  const tiersByCompany = new Map()
  for (const t of data.company_commission_tiers) {
    if (!tiersByCompany.has(t.company_id)) tiersByCompany.set(t.company_id, new Map())
    tiersByCompany.get(t.company_id).set(t.price, Number(t.amount))
  }
  const profileById = new Map(data.profiles.map((p) => [p.id, p]))
  const driverName = (id) => profileById.get(data.drivers.find((d) => d.id === id)?.profile_id)?.name ?? '—'
  const companyName = (id) => companyById.get(id)?.name ?? '(compagnie introuvable)'
  const code = (p) => p.external_reference || p.tracking_number

  const packageById = new Map(data.packages.map((p) => [p.id, p]))
  const active = data.packages.filter((p) => p.deleted_at == null)
  const trashed = data.packages.filter((p) => p.deleted_at != null)
  const delivered = active.filter((p) => p.status === 'LIVRE')
  const priced = delivered.filter((p) => p.price != null)
  const commissionOf = new Map(priced.map((p) => [p.id, commission(p, companyById.get(p.company_id), tiersByCompany)]))

  const now = new Date()
  line(`# Audit des chiffres WINTRACKER — ${now.toLocaleString('fr-FR', { timeZone: 'Africa/Abidjan' })}`)
  line()
  line("Recalcul indépendant à partir des données brutes. Les règles sont celles de l'application :")
  line("colis rattachés à une période par leur **date de prise en compte** (sinon date de création), colis à la corbeille exclus,")
  line('CA et commissions calculés sur les colis **LIVRÉS ayant un prix**.')
  line()

  line('## 1. Intégrité de la lecture')
  line()
  table(['Table', 'Lignes lues', 'Lignes en base', 'OK'], integrity)

  line('## 2. Vue d\'ensemble (depuis le début)')
  line()
  const statuses = ['EN_ATTENTE', 'RECUPERE', 'EN_LIVRAISON', 'LIVRE', 'ECHEC', 'RETOUR']
  table(
    ['Indicateur', 'Valeur'],
    [
      ['Colis actifs (hors corbeille)', fmt(active.length)],
      ['Colis à la corbeille (exclus de tous les chiffres)', fmt(trashed.length)],
      ...statuses.map((s) => [`— dont ${s}`, fmt(active.filter((p) => p.status === s).length)]),
    ],
  )

  // Mois couverts : du premier colis / première dépense au mois courant.
  const firstDates = [...active.map(effectiveDate), ...data.expenses.map((e) => parseDay(e.expense_date))]
  const first = firstDates.length ? new Date(Math.min(...firstDates)) : now
  const months = []
  for (let d = new Date(first.getFullYear(), first.getMonth(), 1); d <= now; d.setMonth(d.getMonth() + 1)) months.push(monthKey(d))

  const inMonth = (p, key) => monthKey(effectiveDate(p)) === key
  const summarize = (pkgs) => {
    const liv = pkgs.filter((p) => p.status === 'LIVRE')
    const livPriced = liv.filter((p) => p.price != null)
    const revenue = livPriced.reduce((s, p) => s + p.price, 0)
    const comm = livPriced.reduce((s, p) => s + commissionOf.get(p.id).amount, 0)
    return { total: pkgs.length, livres: liv.length, livresPrix: livPriced.length, revenue, comm, margin: revenue - comm }
  }

  line('## 3. Finances par mois — toutes compagnies')
  line()
  line('À comparer avec **Finances** et **Dashboard** (filtre « Mois », « Toutes les compagnies »).')
  line('« Livrés (Dashboard) » compte tous les colis livrés ; « Livrés (Finances) » seulement ceux qui ont un prix.')
  line()
  const monthRows = []
  let tot = { total: 0, livres: 0, livresPrix: 0, revenue: 0, comm: 0, margin: 0, exp: 0 }
  for (const key of months) {
    const s = summarize(active.filter((p) => inMonth(p, key)))
    const { start, end } = monthBounds(key)
    const exp = data.expenses.reduce((sum, e) => sum + expenseInRange(e, start, end), 0)
    for (const k of Object.keys(s)) tot[k] += s[k]
    tot.exp += exp
    monthRows.push([monthLabel(key), fmt(s.total), fmt(s.livres), fmt(s.livresPrix), fmt(s.revenue), fmt(s.comm), fmt(s.margin), fmt(exp), fmt(s.margin - exp)])
  }
  monthRows.reverse()
  monthRows.push(['**Total**', ...[tot.total, tot.livres, tot.livresPrix, tot.revenue, tot.comm, tot.margin, tot.exp, tot.margin - tot.exp].map((n) => `**${fmt(n)}**`)])
  table(['Mois', 'Colis', 'Livrés (Dashboard)', 'Livrés (Finances)', 'CA', 'Commissions', 'Marge', 'Dépenses', 'Bénéfice réel'], monthRows)

  line('## 4. Finances par compagnie')
  line()
  line('À comparer avec **Finances** (filtre compagnie) et avec « Vos gains » dans l\'espace de chaque compagnie.')
  line()
  const current = monthKey(now)
  const previous = monthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1))
  for (const [title, filter] of [
    [`Mois en cours (${monthLabel(current)})`, (p) => inMonth(p, current)],
    [`Mois précédent (${monthLabel(previous)})`, (p) => inMonth(p, previous)],
    ['Depuis le début', () => true],
  ]) {
    line(`### ${title}`)
    line()
    const rows = data.companies
      .map((c) => ({ c, s: summarize(active.filter((p) => p.company_id === c.id && filter(p))) }))
      .filter(({ s }) => s.total > 0)
      .sort((a, b) => b.s.revenue - a.s.revenue)
      .map(({ c, s }) => [c.name, fmt(s.total), fmt(s.livres), fmt(s.revenue), fmt(s.comm), fmt(s.margin)])
    if (rows.length) table(['Compagnie', 'Colis', 'Livrés', 'CA', 'Commissions (gains cie)', 'Marge'], rows)
    else line('_Aucun colis._\n')
  }

  line(`## 5. Livreurs — mois en cours (${monthLabel(current)})`)
  line()
  line('À comparer avec **Livreurs** (classement) et la fiche de chaque livreur. « Cash » = somme des prix des colis livrés.')
  line()
  const byDriver = new Map()
  for (const p of delivered.filter((p) => p.driver_id && inMonth(p, current))) {
    const r = byDriver.get(p.driver_id) ?? { n: 0, cash: 0 }
    r.n++
    r.cash += p.price ?? 0
    byDriver.set(p.driver_id, r)
  }
  const driverRows = [...byDriver.entries()].sort((a, b) => b[1].cash - a[1].cash).map(([id, r]) => [driverName(id), fmt(r.n), fmt(r.cash)])
  if (driverRows.length) table(['Livreur', 'Livrés', 'Cash (F)'], driverRows)
  else line('_Aucune livraison ce mois-ci._\n')

  // --- Anomalies ------------------------------------------------------------------
  line('## 6. Anomalies qui faussent les chiffres')
  line()

  const noPrice = delivered.filter((p) => p.price == null)
  line(`### 6.1 Colis livrés sans prix : ${noPrice.length}`)
  line()
  line('Comptés dans « Livrés » du Dashboard mais ni dans le CA, ni dans « Colis livrés » de Finances : les deux écrans divergent.')
  line()
  listSample(noPrice, (p) => `${code(p)} — ${companyName(p.company_id)} — ${dateFr(p.count_date ?? p.created_at)}`)

  const noComm = priced.filter((p) => commissionOf.get(p.id).issue)
  const lostByReason = new Map()
  for (const p of noComm) {
    const key = `${companyName(p.company_id)} : ${commissionOf.get(p.id).issue}`
    const r = lostByReason.get(key) ?? { n: 0, ca: 0 }
    r.n++
    r.ca += p.price
    lostByReason.set(key, r)
  }
  line(`### 6.2 Colis livrés dont la commission n'est pas calculable : ${noComm.length}`)
  line()
  line("L'application compte alors 0 F de commission, sans avertissement : la marge est surestimée et les gains de la compagnie sous-estimés.")
  line()
  if (lostByReason.size) {
    table(
      ['Compagnie : raison', 'Colis', 'CA concerné (F)'],
      [...lostByReason.entries()].sort((a, b) => b[1].n - a[1].n).map(([k, r]) => [k, fmt(r.n), fmt(r.ca)]),
    )
  }

  const odd = active.filter((p) => p.price != null && p.price <= 0)
  line(`### 6.3 Prix nuls ou négatifs : ${odd.length}`)
  line()
  listSample(odd, (p) => `${code(p)} — ${companyName(p.company_id)} — ${p.price} F — ${p.status}`)

  const noDeliveredAt = delivered.filter((p) => !p.delivered_at)
  line(`### 6.4 Colis livrés sans date de livraison : ${noDeliveredAt.length}`)
  line()
  line('Le compteur « Livrés aujourd\'hui » du livreur se rabat alors sur la date de dernière modification.')
  line()
  listSample(noDeliveredAt, (p) => `${code(p)} — ${companyName(p.company_id)}`)

  const shifted = delivered.filter((p) => p.delivered_at && monthKey(new Date(p.delivered_at)) !== monthKey(effectiveDate(p)))
  const shiftedByMonth = new Map()
  for (const p of shifted) {
    const k = `${monthLabel(monthKey(effectiveDate(p)))} → livré en ${monthLabel(monthKey(new Date(p.delivered_at)))}`
    const r = shiftedByMonth.get(k) ?? { n: 0, ca: 0 }
    r.n++
    r.ca += p.price ?? 0
    shiftedByMonth.set(k, r)
  }
  line(`### 6.5 Livraisons comptées dans un autre mois que celui de la livraison : ${shifted.length}`)
  line()
  line("Ce n'est pas une erreur de calcul : c'est la règle (période = date de prise en compte / création). Mais ces colis")
  line("apparaissent dans le CA du mois de création, pas du mois où l'argent a été encaissé.")
  line()
  if (shiftedByMonth.size) table(['Compté en → livré en', 'Colis', 'CA (F)'], [...shiftedByMonth.entries()].map(([k, r]) => [k, fmt(r.n), fmt(r.ca)]))
  line(`Colis avec une date de prise en compte corrigée manuellement : ${active.filter((p) => p.count_date).length}`)
  line()

  const trashedDelivered = trashed.filter((p) => p.status === 'LIVRE' && p.price != null)
  line(`### 6.6 Colis livrés à la corbeille : ${trashedDelivered.length} (${fmt(trashedDelivered.reduce((s, p) => s + p.price, 0))} F de CA exclu)`)
  line()
  line('Exclus de tous les chiffres. À vérifier : un colis livré mis à la corbeille par erreur fait baisser le CA.')
  line()
  listSample(trashedDelivered, (p) => `${code(p)} — ${companyName(p.company_id)} — ${p.price} F — mis à la corbeille le ${dateFr(p.deleted_at)}`)

  // Bilan agent : basé sur les événements LIVRE/ECHEC enregistrés par l'agent.
  // Les étapes annulées par une correction et les corrections elles-mêmes sont exclues des bilans.
  const agentEvents = data.package_events.filter(
    (e) => ['LIVRE', 'ECHEC'].includes(e.new_status) && !e.cancelled_at && !e.is_correction,
  )
  const livreEventsByPkg = new Map()
  for (const e of agentEvents.filter((e) => e.new_status === 'LIVRE')) {
    livreEventsByPkg.set(e.package_id, (livreEventsByPkg.get(e.package_id) ?? 0) + 1)
  }
  const multiLivre = [...livreEventsByPkg.entries()].filter(([, n]) => n > 1)
  const livreNotLivre = [...livreEventsByPkg.keys()].map((id) => packageById.get(id)).filter((p) => p && p.status !== 'LIVRE')
  const onTrashed = agentEvents.filter((e) => packageById.get(e.package_id)?.deleted_at)
  line('### 6.7 Bilans des agents (basés sur l\'historique des statuts)')
  line()
  line('Le bilan d\'un agent additionne chaque passage à LIVRÉ ou ÉCHEC qu\'il a enregistré, pas les colis eux-mêmes.')
  line()
  table(
    ['Cas', 'Nombre'],
    [
      ['Colis passés plusieurs fois à LIVRÉ (cash compté plusieurs fois)', fmt(multiLivre.length)],
      ['Colis passés à LIVRÉ mais dont le statut actuel n\'est plus LIVRÉ (cash compté quand même)', fmt(livreNotLivre.length)],
      ['Événements LIVRÉ/ÉCHEC sur des colis à la corbeille (comptés quand même)', fmt(onTrashed.length)],
    ],
  )
  listSample(
    multiLivre.map(([id, n]) => ({ id, p: packageById.get(id), n })),
    ({ id, p, n }) => `${p ? `${code(p)} — ${companyName(p.company_id)}` : id} — ${n} passages à LIVRÉ`,
  )

  const orphan = active.filter((p) => !companyById.has(p.company_id))
  line(`### 6.8 Colis rattachés à une compagnie introuvable : ${orphan.length}`)
  line()
  listSample(orphan, (p) => `${code(p)} — ${p.status}`)

  const report = out.join('\n')
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, report)
  fs.writeFileSync('audit-finances.md', report)
  console.log(report)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
