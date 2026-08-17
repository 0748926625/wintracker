import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Phone } from 'lucide-react'
import { useRealtimePackage } from '../../hooks/useRealtimePackage'
import { PageLoader } from '../../components/ui/PageLoader'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { PackageTimeline } from '../../components/PackageTimeline'
import { PackageStatusActions } from '../../components/PackageStatusActions'

export default function DriverPackageDetail() {
  const { id } = useParams<{ id: string }>()
  const { pkg, events, loading, refresh } = useRealtimePackage(id)

  if (loading || !pkg) return <PageLoader />

  return (
    <div>
      <Link to="/driver" className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500">
        <ArrowLeft className="h-4 w-4" /> Retour
      </Link>

      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-900">{pkg.tracking_number}</h1>
          <StatusBadge status={pkg.status} />
        </div>

        <p className="text-xl font-semibold text-gray-900">{pkg.recipient_name}</p>
        <a
          href={`tel:${pkg.recipient_phone}`}
          className="mb-2 flex items-center gap-1.5 text-brand-600"
        >
          <Phone className="h-4 w-4" /> {pkg.recipient_phone}
        </a>
        <p className="text-gray-600">{pkg.delivery_address}</p>
        {pkg.description && <p className="mt-2 text-sm text-gray-500">{pkg.description}</p>}
      </div>

      <div className="mt-4">
        <PackageStatusActions pkg={pkg} onChanged={refresh} />
      </div>

      <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-gray-700">Historique</h2>
        <PackageTimeline events={events} />
      </div>
    </div>
  )
}
