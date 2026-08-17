import { MapPin } from 'lucide-react'
import { PACKAGE_STATUS_LABELS } from '../types/database'
import type { PackageEvent } from '../types/database'
import { googleMapsUrl } from '../lib/geolocation'

const STEP_LABELS: Record<string, string> = {
  EN_ATTENTE: 'Colis enregistré',
  RECUPERE: 'Colis récupéré',
  EN_LIVRAISON: 'En livraison',
  LIVRE: 'Livré',
  ECHEC: 'Échec de livraison',
  RETOUR: 'Retourné',
}

export function PackageTimeline({ events }: { events: PackageEvent[] }) {
  if (events.length === 0) {
    return <p className="text-sm text-gray-400">Aucun événement pour le moment.</p>
  }

  return (
    <ol className="relative border-l-2 border-gray-200 pl-4">
      {events.map((event) => (
        <li key={event.id} className="mb-6 last:mb-0">
          <span className="absolute -left-[9px] mt-1 h-4 w-4 rounded-full border-2 border-white bg-brand-600" />
          <p className="text-xs font-medium text-gray-400">
            {new Date(event.created_at).toLocaleDateString('fr-FR', {
              day: '2-digit',
              month: 'long',
            })}
            {' — '}
            {new Date(event.created_at).toLocaleTimeString('fr-FR', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
          <p className="font-semibold text-gray-900">
            {STEP_LABELS[event.new_status] ?? PACKAGE_STATUS_LABELS[event.new_status]}
          </p>
          {event.comment && <p className="text-sm text-gray-500">{event.comment}</p>}
          {event.latitude != null && event.longitude != null && (
            <a
              href={googleMapsUrl({ latitude: event.latitude, longitude: event.longitude })}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline"
            >
              <MapPin className="h-3.5 w-3.5" /> Voir sur la carte
            </a>
          )}
        </li>
      ))}
    </ol>
  )
}
