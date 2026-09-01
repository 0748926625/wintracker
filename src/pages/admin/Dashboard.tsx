import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Package, Clock, PackageCheck, Truck, CheckCircle2, XCircle, RotateCcw, Printer } from 'lucide-react'
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import { useAuth } from '../../hooks/useAuth'
import { useRealtimePackages } from '../../hooks/useRealtimePackages'
import { useGare } from '../../hooks/useGare'
import { usePeriodFilter } from '../../hooks/usePeriodFilter'
import { listAllPackages, listCompanyPackages, listCompaniesPackages } from '../../services/packages'
import { listCompanies } from '../../services/companies'
import { listCompanyGroups } from '../../services/groups'
import { StatCard } from '../../components/ui/StatCard'
import { PageLoader } from '../../components/ui/PageLoader'
import { Select } from '../../components/ui/Field'
import { PeriodSwitcher } from '../../components/ui/PeriodSwitcher'
import {
  PACKAGE_STATUS_LABELS,
  type Company,
  type CompanyGroup,
  type PackageStatus,
} from '../../types/database'

type Scope = { type: 'ALL' } | { type: 'COMPANY'; id: string } | { type: 'GROUP'; id: string }

const STATUS_HEX: Record<PackageStatus, string> = {
  EN_ATTENTE: '#6b7280',
  RECUPERE: '#3b82f6',
  EN_LIVRAISON: '#f59e0b',
  LIVRE: '#22c55e',
  ECHEC: '#ef4444',
  RETOUR: '#a855f7',
}

const MAX_EVOLUTION_DAYS = 60

function dayBounds(d: Date) {
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0)
  const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59)
  return { start, end }
}

export default function AdminDashboard() {
  const { profile } = useAuth()
  const { activeCompanyId: gareCompanyId } = useGare()
  const isSuperAdmin = profile?.role === 'SUPER_ADMIN'

  const [companies, setCompanies] = useState<Company[]>([])
  const [groups, setGroups] = useState<CompanyGroup[]>([])
  const [scope, setScope] = useState<Scope>({ type: 'ALL' })

  useEffect(() => {
    if (isSuperAdmin) {
      listCompanies().then(setCompanies)
      listCompanyGroups().then(setGroups)
    }
  }, [isSuperAdmin])

  function handleScopeChange(value: string) {
    if (value === 'ALL') setScope({ type: 'ALL' })
    else {
      const [type, id] = value.split(':')
      setScope({ type: type as 'COMPANY' | 'GROUP', id })
    }
  }

  const activeCompanyIds = useMemo(() => {
    if (!isSuperAdmin) return gareCompanyId ? [gareCompanyId] : null
    if (scope.type === 'ALL') return null
    if (scope.type === 'COMPANY') return [scope.id]
    return companies.filter((c) => c.group_id === scope.id).map((c) => c.id)
  }, [isSuperAdmin, gareCompanyId, scope, companies])

  const fetcher = useCallback(() => {
    if (!activeCompanyIds) return listAllPackages()
    if (activeCompanyIds.length === 1) return listCompanyPackages(activeCompanyIds[0])
    return listCompaniesPackages(activeCompanyIds)
  }, [activeCompanyIds])
  const singleCompanyId = activeCompanyIds?.length === 1 ? activeCompanyIds[0] : null
  const bilanHref =
    scope.type === 'ALL'
      ? '/admin/bilan/all/all'
      : scope.type === 'COMPANY'
        ? `/admin/bilan/company/${scope.id}`
        : `/admin/bilan/group/${scope.id}`
  const { packages, loading } = useRealtimePackages(
    fetcher,
    singleCompanyId ? 'company_id' : 'all',
    singleCompanyId ?? 'all',
  )

  const pf = usePeriodFilter()

  if (loading) return <PageLoader />

  const scoped = packages.filter((p) => pf.inRange(p.created_at))
  const count = (status: PackageStatus) => scoped.filter((p) => p.status === status).length

  const statusData = (Object.keys(PACKAGE_STATUS_LABELS) as PackageStatus[])
    .map((status) => ({ status, name: PACKAGE_STATUS_LABELS[status], value: count(status) }))
    .filter((d) => d.value > 0)

  const days: Date[] = []
  {
    const cursor = new Date(pf.start.getFullYear(), pf.start.getMonth(), pf.start.getDate())
    const last = new Date(pf.end.getFullYear(), pf.end.getMonth(), pf.end.getDate())
    while (cursor <= last && days.length < MAX_EVOLUTION_DAYS) {
      days.push(new Date(cursor))
      cursor.setDate(cursor.getDate() + 1)
    }
  }
  const evolutionData = days.map((date) => {
    const { start, end } = dayBounds(date)
    const delivered = packages.filter((p) => {
      if (p.status !== 'LIVRE') return false
      const d = new Date(p.created_at)
      return d >= start && d <= end
    })
    return {
      label: date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
      livres: delivered.length,
      ca: delivered.reduce((sum, p) => sum + (p.price ?? 0), 0),
    }
  })

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {isSuperAdmin && (
            <Select
              value={scope.type === 'ALL' ? 'ALL' : `${scope.type}:${scope.id}`}
              onChange={(e) => handleScopeChange(e.target.value)}
              className="sm:max-w-xs"
            >
              <option value="ALL">Toutes les compagnies</option>
              {groups.length > 0 && (
                <optgroup label="Groupes">
                  {groups.map((g) => (
                    <option key={g.id} value={`GROUP:${g.id}`}>
                      {g.name}
                    </option>
                  ))}
                </optgroup>
              )}
              <optgroup label="Compagnies">
                {companies.map((c) => (
                  <option key={c.id} value={`COMPANY:${c.id}`}>
                    {c.name}
                  </option>
                ))}
              </optgroup>
            </Select>
          )}
          <PeriodSwitcher pf={pf} />
          {isSuperAdmin && (
            <Link
              to={bilanHref}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-brand-600 hover:bg-gray-50"
            >
              <Printer className="h-4 w-4" /> Bilan
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard label="Total colis" value={scoped.length} icon={Package} />
        <StatCard label="En attente" value={count('EN_ATTENTE')} icon={Clock} />
        <StatCard label="Récupérés" value={count('RECUPERE')} icon={PackageCheck} />
        <StatCard label="En livraison" value={count('EN_LIVRAISON')} icon={Truck} />
        <StatCard
          label="Livrés"
          value={count('LIVRE')}
          icon={CheckCircle2}
          accent="text-green-600"
        />
        <StatCard label="Échecs" value={count('ECHEC')} icon={XCircle} accent="text-red-600" />
        <StatCard label="Retours" value={count('RETOUR')} icon={RotateCcw} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <h2 className="mb-3 font-semibold text-gray-900">Répartition par statut</h2>
          {statusData.length === 0 ? (
            <p className="py-12 text-center text-sm text-gray-400">
              Aucun colis sur cette période.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={statusData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={60}
                  outerRadius={95}
                  paddingAngle={2}
                >
                  {statusData.map((d) => (
                    <Cell key={d.status} fill={STATUS_HEX[d.status]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [value, 'Colis']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <h2 className="mb-3 font-semibold text-gray-900">Évolution des livraisons</h2>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={evolutionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 12 }} allowDecimals={false} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="livres"
                name="Colis livrés"
                stroke="#22c55e"
                strokeWidth={2}
                dot={false}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="ca"
                name="Chiffre d'affaires (F)"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
