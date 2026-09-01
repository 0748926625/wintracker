import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Printer } from 'lucide-react'
import { usePeriodFilter } from '../../hooks/usePeriodFilter'
import { PeriodSwitcher } from '../../components/ui/PeriodSwitcher'
import { getCompany, listCompanies } from '../../services/companies'
import { listCompanyGroups } from '../../services/groups'
import { getDriver } from '../../services/drivers'
import { getAgent } from '../../services/agents'
import {
  listCompanyPackages,
  listCompaniesPackages,
  listDriverPackages,
  listAgentEvents,
} from '../../services/packages'
import { commissionForPackage } from '../../lib/commission'
import type { Package, PackageStatus } from '../../types/database'
import { PageLoader } from '../../components/ui/PageLoader'
import { StatCard } from '../../components/ui/StatCard'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { Button } from '../../components/ui/Button'

type BilanType = 'group' | 'company' | 'driver' | 'agent'

const TYPE_LABELS: Record<BilanType, string> = {
  group: 'Groupe',
  company: 'Compagnie',
  driver: 'Livreur',
  agent: 'Agent Wintrack',
}

interface BilanRow {
  id: string
  code: string
  company: string
  recipient: string
  price: number | null
  status: PackageStatus
  date: string
}

export default function AdminBilan() {
  const { type, id } = useParams<{ type: BilanType; id: string }>()
  const navigate = useNavigate()
  const pf = usePeriodFilter()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [entityName, setEntityName] = useState('')
  const [entitySubtitle, setEntitySubtitle] = useState<string | null>(null)
  const [rows, setRows] = useState<BilanRow[]>([])
  /** Non null uniquement pour compagnie/groupe : permet de calculer les commissions. */
  const [statCards, setStatCards] = useState<{ label: string; value: number; accent?: string }[]>([])

  useEffect(() => {
    if (!type || !id) return
    let cancelled = false
    setLoading(true)
    setError(null)

    async function load() {
      if (type === 'company') {
        const company = await getCompany(id!)
        const packages = await listCompanyPackages(id!)
        if (cancelled) return
        setEntityName(company.name)
        setEntitySubtitle(null)
        buildPackageBilan(packages, [company.id])
      } else if (type === 'group') {
        const [groups, companies] = await Promise.all([listCompanyGroups(), listCompanies()])
        const group = groups.find((g) => g.id === id)
        const groupCompanies = companies.filter((c) => c.group_id === id)
        const packages = await listCompaniesPackages(groupCompanies.map((c) => c.id))
        if (cancelled) return
        setEntityName(group?.name ?? 'Groupe')
        setEntitySubtitle(`${groupCompanies.length} compagnie(s) : ${groupCompanies.map((c) => c.name).join(', ')}`)
        buildPackageBilan(packages, groupCompanies.map((c) => c.id))
      } else if (type === 'driver') {
        const driver = await getDriver(id!)
        const packages = await listDriverPackages(id!)
        if (cancelled) return
        setEntityName(driver.profile?.name ?? 'Livreur')
        setEntitySubtitle(driver.profile?.phone ?? null)
        buildDriverBilan(packages)
      } else if (type === 'agent') {
        const agent = await getAgent(id!)
        const events = await listAgentEvents(agent.user_id)
        if (cancelled) return
        setEntityName(agent.name)
        setEntitySubtitle(agent.phone)
        buildAgentBilan(events.map((e) => ({ ...e, package: e.package })))
      }
    }

    function buildPackageBilan(packages: Package[], _companyIds: string[]) {
      const period = packages.filter((p) => pf.inRange(p.created_at))
      const livres = period.filter((p) => p.status === 'LIVRE')
      const cash = livres.reduce((sum, p) => sum + (p.price ?? 0), 0)
      const commission = livres.reduce((sum, p) => sum + (commissionForPackage(p, p.company ?? null) ?? 0), 0)
      setStatCards([
        { label: 'Total colis', value: period.length },
        { label: 'Colis livrés', value: livres.length, accent: 'text-green-600' },
        { label: "Chiffre d'affaires (F)", value: cash },
        { label: 'Commissions versées (F)', value: commission },
        { label: 'Marge (F)', value: cash - commission, accent: 'text-green-600' },
      ])
      setRows(
        period.map((p) => ({
          id: p.id,
          code: p.external_reference || p.tracking_number,
          company: p.company?.name ?? '—',
          recipient: p.recipient_name,
          price: p.price,
          status: p.status,
          date: p.created_at,
        })),
      )
    }

    function buildDriverBilan(packages: Package[]) {
      const period = packages.filter((p) => pf.inRange(p.created_at))
      const livres = period.filter((p) => p.status === 'LIVRE')
      const retours = period.filter((p) => p.status === 'RETOUR')
      const echecs = period.filter((p) => p.status === 'ECHEC')
      const cash = livres.reduce((sum, p) => sum + (p.price ?? 0), 0)
      setStatCards([
        { label: 'Total colis', value: period.length },
        { label: 'Colis livrés', value: livres.length, accent: 'text-green-600' },
        { label: 'Cash généré (F)', value: cash },
        { label: 'Retours', value: retours.length },
        { label: 'Échecs', value: echecs.length, accent: 'text-red-600' },
      ])
      setRows(
        period.map((p) => ({
          id: p.id,
          code: p.external_reference || p.tracking_number,
          company: p.company?.name ?? '—',
          recipient: p.recipient_name,
          price: p.price,
          status: p.status,
          date: p.created_at,
        })),
      )
    }

    function buildAgentBilan(events: { id: string; new_status: PackageStatus; created_at: string; package: Package }[]) {
      const period = events.filter((e) => pf.inRange(e.created_at))
      const livres = period.filter((e) => e.new_status === 'LIVRE')
      const echecs = period.filter((e) => e.new_status === 'ECHEC')
      const cash = livres.reduce((sum, e) => sum + (e.package.price ?? 0), 0)
      setStatCards([
        { label: 'Colis traités', value: period.length },
        { label: 'Livrés', value: livres.length, accent: 'text-green-600' },
        { label: 'Échecs', value: echecs.length, accent: 'text-red-600' },
        { label: 'Cash généré (F)', value: cash },
      ])
      setRows(
        period.map((e) => ({
          id: e.id,
          code: e.package.external_reference || e.package.tracking_number,
          company: e.package.company?.name ?? '—',
          recipient: e.package.recipient_name,
          price: e.package.price,
          status: e.new_status,
          date: e.created_at,
        })),
      )
    }

    load()
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : 'Erreur'))
      .finally(() => !cancelled && setLoading(false))

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, id, pf.mode, pf.start.getTime(), pf.end.getTime()])

  if (!type || !id || !(type in TYPE_LABELS)) {
    return <p className="p-8 text-gray-500">Bilan introuvable.</p>
  }

  return (
    <div className="mx-auto min-h-screen max-w-4xl bg-white p-6 print:p-0">
      <div className="no-print mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" /> Retour
        </button>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <PeriodSwitcher pf={pf} />
          <Button onClick={() => window.print()} className="w-full sm:w-auto">
            <Printer className="h-4 w-4" /> Imprimer
          </Button>
        </div>
      </div>

      {loading ? (
        <PageLoader />
      ) : error ? (
        <p className="text-sm font-medium text-red-600">{error}</p>
      ) : (
        <>
          <div className="mb-6 border-b border-gray-200 pb-4">
            <p className="text-lg font-extrabold tracking-tight text-brand-600">WINTRACKER</p>
            <h1 className="mt-2 text-2xl font-bold text-gray-900">
              Bilan {TYPE_LABELS[type].toLowerCase()} — {entityName}
            </h1>
            {entitySubtitle && <p className="mt-1 text-sm text-gray-500">{entitySubtitle}</p>}
            <p className="mt-1 text-sm text-gray-500">
              Période : {pf.label} · Généré le {new Date().toLocaleDateString('fr-FR')}
            </p>
          </div>

          <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {statCards.map((c) => (
              <StatCard key={c.label} label={c.label} value={c.value} accent={c.accent} />
            ))}
          </div>

          <div className="overflow-x-auto rounded-2xl border border-gray-200">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Code colis</th>
                  <th className="px-4 py-3 font-medium">Compagnie</th>
                  <th className="px-4 py-3 font-medium">Destinataire</th>
                  <th className="px-4 py-3 font-medium">Prix</th>
                  <th className="px-4 py-3 font-medium">Statut</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-3 font-medium text-gray-900">{r.code}</td>
                    <td className="px-4 py-3 text-gray-600">{r.company}</td>
                    <td className="px-4 py-3 text-gray-900">{r.recipient}</td>
                    <td className="px-4 py-3 text-gray-600">{r.price ? `${r.price} F` : '—'}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(r.date).toLocaleDateString('fr-FR')}
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                      Aucun colis sur cette période.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
