import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useRealtimePackage } from '../../hooks/useRealtimePackage'
import { assignDriver } from '../../services/packages'
import { listDrivers } from '../../services/drivers'
import { commissionForPackage } from '../../lib/commission'
import type { Driver } from '../../types/database'
import { PageLoader } from '../../components/ui/PageLoader'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { PackageTimeline } from '../../components/PackageTimeline'
import { PackageStatusActions } from '../../components/PackageStatusActions'
import { Select } from '../../components/ui/Field'

export default function AdminPackageDetail() {
  const { id } = useParams<{ id: string }>()
  const { pkg, events, loading, refresh } = useRealtimePackage(id)
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [assigning, setAssigning] = useState(false)

  useEffect(() => {
    listDrivers().then((all) => setDrivers(all.filter((d) => d.status === 'ACTIVE')))
  }, [])

  if (loading || !pkg) return <PageLoader />

  async function handleAssign(driverId: string) {
    setAssigning(true)
    try {
      await assignDriver(pkg!.id, driverId || null)
      await refresh()
    } finally {
      setAssigning(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link to="/admin/packages" className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500">
        <ArrowLeft className="h-4 w-4" /> Retour
      </Link>

      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">WINTRACKER</p>
            <h1 className="text-xl font-bold text-gray-900">
              {pkg.external_reference || pkg.tracking_number}
            </h1>
          </div>
          <StatusBadge status={pkg.status} />
        </div>

        <dl className="grid grid-cols-2 gap-4 text-sm">
          <Info label="Compagnie" value={pkg.company?.name} />
          <Info label="Numéro de colis" value={pkg.external_reference} />
          <Info label="N° de suivi (interne)" value={pkg.tracking_number} />
          <Info label="Date d'enregistrement" value={new Date(pkg.created_at).toLocaleDateString('fr-FR')} />
          <Info label="Agent de la gare" value={pkg.agent?.name} />
          <Info label="Tarif" value={pkg.price ? `${pkg.price} F` : null} />
          <Info
            label="Commission"
            value={(() => {
              const commission = commissionForPackage(pkg, pkg.company ?? null)
              return commission != null ? `${commission} F` : null
            })()}
          />
          <Info label="Destinataire" value={pkg.recipient_name} />
          <Info label="Téléphone" value={pkg.recipient_phone} />
          <Info label="Adresse" value={pkg.delivery_address} />
          <Info label="Expéditeur" value={pkg.sender_name} />
          <Info label="Tél. expéditeur" value={pkg.sender_phone} />
          {pkg.description && <Info label="Description" value={pkg.description} />}
        </dl>

        <div className="mt-5 border-t border-gray-100 pt-4">
          <label className="mb-1 block text-sm font-medium text-gray-700">Livreur affecté</label>
          <Select
            value={pkg.driver_id ?? ''}
            disabled={assigning}
            onChange={(e) => handleAssign(e.target.value)}
          >
            <option value="">Non affecté</option>
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.profile?.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-gray-700">
          Statut (compte-rendu du livreur)
        </h2>
        <PackageStatusActions pkg={pkg} onChanged={refresh} />
      </div>

      <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-gray-700">Historique</h2>
        <PackageTimeline events={events} />
      </div>
    </div>
  )
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-gray-400">{label}</dt>
      <dd className="font-medium text-gray-900">{value || '—'}</dd>
    </div>
  )
}
