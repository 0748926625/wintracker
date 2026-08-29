import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import {
  markRecupere,
  commencerLivraison,
  nouvelleTentative,
  marquerRetour,
  confirmDelivery,
  declareFailure,
  uploadDeliveryPhoto,
} from '../services/packages'
import { FAILURE_REASONS, type Package } from '../types/database'
import { Button } from './ui/Button'
import { Modal } from './ui/Modal'
import { Field, Input, Select, Textarea } from './ui/Field'

/**
 * Boutons d'action pour faire progresser le statut d'un colis.
 * Utilisé par l'espace livreur (sur le terrain, GPS capturé) et par
 * l'espace admin/agent (compte-rendu du livreur, sans GPS — la position
 * de l'agent en gare ne correspond pas au lieu réel de l'action).
 */
export function PackageStatusActions({
  pkg,
  onChanged,
}: {
  pkg: Package
  onChanged: () => void | Promise<void>
}) {
  const { profile } = useAuth()
  const captureLocation = profile?.role === 'DRIVER'

  const [confirmingPickup, setConfirmingPickup] = useState(false)
  const [deliveringOpen, setDeliveringOpen] = useState(false)
  const [failureOpen, setFailureOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  async function run(action: () => Promise<unknown>) {
    setBusy(true)
    try {
      await action()
      await onChanged()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3">
      {pkg.status === 'EN_ATTENTE' && (
        <Button className="w-full" onClick={() => setConfirmingPickup(true)}>
          MARQUER COMME RÉCUPÉRÉ
        </Button>
      )}

      {pkg.status === 'RECUPERE' && (
        <Button
          className="w-full"
          loading={busy}
          onClick={() => run(() => commencerLivraison(pkg.id))}
        >
          COMMENCER LA LIVRAISON
        </Button>
      )}

      {pkg.status === 'EN_LIVRAISON' && (
        <>
          <Button className="w-full" onClick={() => setDeliveringOpen(true)}>
            LIVRER
          </Button>
          <Button variant="danger" className="w-full" onClick={() => setFailureOpen(true)}>
            ÉCHEC
          </Button>
        </>
      )}

      {pkg.status === 'ECHEC' && (
        <>
          <Button
            className="w-full"
            loading={busy}
            onClick={() => run(() => nouvelleTentative(pkg.id))}
          >
            NOUVELLE TENTATIVE
          </Button>
          <Button
            variant="secondary"
            className="w-full"
            loading={busy}
            onClick={() => run(() => marquerRetour(pkg.id))}
          >
            RETOUR
          </Button>
        </>
      )}

      {pkg.status === 'RETOUR' && (
        <>
          <Button
            className="w-full"
            loading={busy}
            onClick={() => run(() => nouvelleTentative(pkg.id))}
          >
            NOUVELLE TENTATIVE
          </Button>
          <Button variant="danger" className="w-full" onClick={() => setFailureOpen(true)}>
            MARQUER ÉCHEC DÉFINITIF
          </Button>
        </>
      )}

      {confirmingPickup && (
        <Modal title="Confirmer la récupération" onClose={() => setConfirmingPickup(false)}>
          <p className="mb-4 text-gray-600">
            Confirmez-vous avoir récupéré le colis {pkg.external_reference || pkg.tracking_number} ?
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setConfirmingPickup(false)}>
              Annuler
            </Button>
            <Button
              className="flex-1"
              loading={busy}
              onClick={() =>
                run(() => markRecupere(pkg.id, captureLocation)).then(() => setConfirmingPickup(false))
              }
            >
              Confirmer
            </Button>
          </div>
        </Modal>
      )}

      {deliveringOpen && (
        <DeliveryModal
          packageId={pkg.id}
          defaultReceiverName={pkg.recipient_name}
          captureLocation={captureLocation}
          onClose={() => setDeliveringOpen(false)}
          onDone={async () => {
            setDeliveringOpen(false)
            await onChanged()
          }}
        />
      )}

      {failureOpen && (
        <FailureModal
          packageId={pkg.id}
          onClose={() => setFailureOpen(false)}
          onDone={async () => {
            setFailureOpen(false)
            await onChanged()
          }}
        />
      )}
    </div>
  )
}

function DeliveryModal({
  packageId,
  defaultReceiverName,
  captureLocation,
  onClose,
  onDone,
}: {
  packageId: string
  defaultReceiverName: string
  captureLocation: boolean
  onClose: () => void
  onDone: () => void
}) {
  const [receiverName, setReceiverName] = useState(defaultReceiverName)
  const [comment, setComment] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      let photo_url: string | undefined
      if (photo) photo_url = await uploadDeliveryPhoto(packageId, photo)
      await confirmDelivery(packageId, { receiver_name: receiverName, comment, photo_url }, captureLocation)
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title="Confirmer la livraison" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <Field label="Nom de la personne ayant reçu le colis">
          <Input required value={receiverName} onChange={(e) => setReceiverName(e.target.value)} />
        </Field>
        <Field label="Commentaire (facultatif)">
          <Textarea rows={2} value={comment} onChange={(e) => setComment(e.target.value)} />
        </Field>
        <Field label="Photo (facultatif)">
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-gray-600"
          />
        </Field>
        {error && <p className="mb-3 text-sm font-medium text-red-600">{error}</p>}
        <Button type="submit" loading={loading} className="w-full">
          CONFIRMER LA LIVRAISON
        </Button>
      </form>
    </Modal>
  )
}

function FailureModal({
  packageId,
  onClose,
  onDone,
}: {
  packageId: string
  onClose: () => void
  onDone: () => void
}) {
  const [reason, setReason] = useState<string>(FAILURE_REASONS[0])
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await declareFailure(packageId, reason, comment)
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title="Déclarer un échec" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <Field label="Motif">
          <Select value={reason} onChange={(e) => setReason(e.target.value)}>
            {FAILURE_REASONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Commentaire (facultatif)">
          <Textarea rows={2} value={comment} onChange={(e) => setComment(e.target.value)} />
        </Field>
        {error && <p className="mb-3 text-sm font-medium text-red-600">{error}</p>}
        <Button type="submit" variant="danger" loading={loading} className="w-full">
          Confirmer l'échec
        </Button>
      </form>
    </Modal>
  )
}
