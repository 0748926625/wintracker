import { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, PackageCheck, RotateCcw, XCircle, Wallet } from 'lucide-react'
import { getDriver } from '../../services/drivers'
import { listDriverPackages } from '../../services/packages'
import { useRealtimePackages } from '../../hooks/useRealtimePackages'
import { usePeriodFilter } from '../../hooks/usePeriodFilter'
import type { Driver, Package } from '../../types/database'
import { PageLoader } from '../../components/ui/PageLoader'
import { StatCard } from '../../components/ui/StatCard'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { PeriodSwitcher } from '../../components/ui/PeriodSwitcher'

export default function AdminDriverDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [driver, setDriver] = useState<Driver | null>(null)
  const [driverLoading, setDriverLoading] = useState(true)
  const pf = usePeriodFilter()

  useEffect(() => {
    if (!id) return
    setDriverLoading(true)
    getDriver(id)
      .then(setDriver)
      .catch(() => setDriver(null))
      .finally(() => setDriverLoading(false))
  }, [id])

  const fetcher = useCallback(() => (id ? listDriverPackages(id) : Promise.resolve([])), [id])
  const { packages, loading: packagesLoading } = useRealtimePackages(fetcher, 'driver_id', id)

  if (driverLoading || packagesLoading) return <PageLoader />
  if (!driver) return <p className="text-gray-500">Livreur introuvable.</p>

  const livres = packages.filter((p) => p.status === 'LIVRE' && pf.inRange(p.created_at))
  const retours = packages.filter((p) => p.status === 'RETOUR' && pf.inRange(p.created_at))
  const echecs = packages.filter((p) => p.status === 'ECHEC' && pf.inRange(p.created_at))
  const cash = livres.reduce((sum, p) => sum + (p.price ?? 0), 0)
  const enCours = packages.filter((p) =>
    ['EN_ATTENTE', 'RECUPERE', 'EN_LIVRAISON'].includes(p.status),
  )

  const dateOf = (p: Package) => p.delivered_at ?? p.updated_at
  const historique = [...livres, ...retours, ...echecs].sort((a, b) =>
    dateOf(b).localeCompare(dateOf(a)),
  )

  return (
    <div>
      <button
        onClick={() => navigate('/admin/drivers')}
        className="mb-4 flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" /> Livreurs
      </button>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{driver.profile?.name}</h1>
          <p className="text-sm text-gray-500">
            {driver.profile?.phone || '—'} ·{' '}
            <span className={driver.status === 'ACTIVE' ? 'text-green-600' : 'text-gray-500'}>
              {driver.status === 'ACTIVE' ? 'Actif' : 'Inactif'}
            </span>
            {enCours.length > 0 && ` · ${enCours.length} colis en cours`}
          </p>
        </div>
        <PeriodSwitcher pf={pf} />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Colis livrés" value={livres.length} icon={PackageCheck} accent="text-green-600" />
        <StatCard label="Cash généré (F)" value={cash} icon={Wallet} accent="text-brand-600" />
        <StatCard label="Retours" value={retours.length} icon={RotateCcw} />
        <StatCard label="Échecs" value={echecs.length} icon={XCircle} accent="text-red-600" />
      </div>

      <h2 className="mb-3 mt-8 text-lg font-bold text-gray-900">Historique de la période</h2>
      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
        <table className="w-full min-w-[680px] text-left text-sm">
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
            {historique.map((p) => (
              <tr key={p.id} className="cursor-pointer hover:bg-gray-50">
                <td className="px-4 py-3">
                  <Link to={`/admin/packages/${p.id}`} className="block font-medium text-brand-600">
                    {p.external_reference || p.tracking_number}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-600">{p.company?.name}</td>
                <td className="px-4 py-3 text-gray-900">{p.recipient_name}</td>
                <td className="px-4 py-3 text-gray-600">{p.price ? `${p.price} F` : '—'}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={p.status} />
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {new Date(p.delivered_at ?? p.updated_at).toLocaleDateString('fr-FR')}
                </td>
              </tr>
            ))}
            {historique.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  Aucun colis livré, retourné ou en échec sur cette période.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
