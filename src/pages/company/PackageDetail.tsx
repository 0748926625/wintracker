import { useParams, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useRealtimePackage } from '../../hooks/useRealtimePackage'
import { PageLoader } from '../../components/ui/PageLoader'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { PackageTimeline } from '../../components/PackageTimeline'

export default function CompanyPackageDetail() {
  const { id } = useParams<{ id: string }>()
  const { pkg, events, loading } = useRealtimePackage(id)

  if (loading || !pkg) return <PageLoader />

  return (
    <div className="mx-auto max-w-2xl">
      <Link to="/company" className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500">
        <ArrowLeft className="h-4 w-4" /> Retour
      </Link>

      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">WINTRACKER</p>
        <h1 className="mb-4 text-xl font-bold text-gray-900">{pkg.tracking_number}</h1>

        <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <Info label="Compagnie" value={pkg.company?.name} />
          <Info label="Numéro de colis" value={pkg.external_reference} />
          <Info label="Date d'enregistrement" value={new Date(pkg.created_at).toLocaleDateString('fr-FR')} />
          <Info label="Tarif" value={pkg.price ? `${pkg.price} F` : null} />
          <Info label="Destinataire" value={pkg.recipient_name} />
          <Info label="Téléphone" value={pkg.recipient_phone} />
          <Info label="Adresse" value={pkg.delivery_address} />
        </dl>

        <div className="mt-5 border-t border-gray-100 pt-4">
          <p className="mb-2 text-sm text-gray-500">Statut actuel</p>
          <StatusBadge status={pkg.status} className="text-base" />
        </div>
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
