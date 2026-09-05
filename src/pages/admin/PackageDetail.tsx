import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Pencil, Trash2, RotateCcw } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useGare } from '../../hooks/useGare'
import { useRealtimePackage } from '../../hooks/useRealtimePackage'
import {
  assignDriver,
  updatePackage,
  setCountDate,
  setCreatedAt,
  softDeletePackage,
  restorePackage,
  purgePackage,
  type CreatePackageInput,
} from '../../services/packages'
import { listDrivers } from '../../services/drivers'
import { listCompanies } from '../../services/companies'
import { listGareAgents } from '../../services/gareAgents'
import { commissionForPackage } from '../../lib/commission'
import { creatorLabel } from '../../lib/packageCreator'
import { PRICE_OPTIONS, type Company, type Driver, type GareAgent, type Package } from '../../types/database'
import { PageLoader } from '../../components/ui/PageLoader'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { PackageTimeline } from '../../components/PackageTimeline'
import { PackageStatusActions } from '../../components/PackageStatusActions'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { Field, Input, Select, Textarea } from '../../components/ui/Field'

export default function AdminPackageDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const { pkg, events, loading, refresh } = useRealtimePackage(id)
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [assigning, setAssigning] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editingCountDate, setEditingCountDate] = useState(false)
  const [editingCreatedAt, setEditingCreatedAt] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [purging, setPurging] = useState(false)
  const [restoring, setRestoring] = useState(false)

  const isSuperAdmin = profile?.role === 'SUPER_ADMIN'
  const canDelete = isSuperAdmin || profile?.can_delete_packages === true

  useEffect(() => {
    listDrivers().then((all) => setDrivers(all.filter((d) => d.status === 'ACTIVE')))
  }, [])

  if (loading || !pkg) return <PageLoader />

  const isTrashed = pkg.deleted_at != null
  const hasBeenReturned = events.some((e) => e.new_status === 'RETOUR')
  const showCountDate = hasBeenReturned && pkg.status === 'LIVRE'

  async function handleAssign(driverId: string) {
    setAssigning(true)
    try {
      await assignDriver(pkg!.id, driverId || null)
      await refresh()
    } finally {
      setAssigning(false)
    }
  }

  async function handleRestore() {
    setRestoring(true)
    try {
      await restorePackage(pkg!.id)
      await refresh()
    } finally {
      setRestoring(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link to="/admin/packages" className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500">
        <ArrowLeft className="h-4 w-4" /> Retour
      </Link>

      {isTrashed && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
          Ce colis est à la corbeille depuis le {new Date(pkg.deleted_at!).toLocaleDateString('fr-FR')}.
        </div>
      )}

      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">WINTRACKER</p>
            <h1 className="text-xl font-bold text-gray-900">
              {pkg.external_reference || pkg.tracking_number}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={pkg.status} />
            {!isTrashed && (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
              >
                <Pencil className="h-3.5 w-3.5" /> Modifier
              </button>
            )}
            {!isTrashed && canDelete && (
              <button
                onClick={() => setDeleting(true)}
                className="flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-3.5 w-3.5" /> Supprimer
              </button>
            )}
            {isTrashed && canDelete && (
              <button
                onClick={handleRestore}
                disabled={restoring}
                className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Restaurer
              </button>
            )}
            {isTrashed && isSuperAdmin && (
              <button
                onClick={() => setPurging(true)}
                className="flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-3.5 w-3.5" /> Supprimer définitivement
              </button>
            )}
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-4 text-sm">
          <Info label="Compagnie" value={pkg.company?.name} />
          <Info label="Code colis" value={pkg.external_reference} />
          <Info label="N° de suivi (interne)" value={pkg.tracking_number} />
          <div>
            <dt className="text-gray-400">Date d'enregistrement</dt>
            <dd className="flex items-center gap-1.5 font-medium text-gray-900">
              {new Date(pkg.created_at).toLocaleDateString('fr-FR')}
              {isSuperAdmin && (
                <button
                  type="button"
                  onClick={() => setEditingCreatedAt(true)}
                  title="Modifier la date de création"
                  className="text-gray-300 hover:text-gray-500"
                >
                  <Pencil className="h-3 w-3" />
                </button>
              )}
            </dd>
          </div>
          <Info label="Enregistré par" value={creatorLabel(pkg.creator)} />
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

        {showCountDate && (
          <div className="mt-4 border-t border-gray-100 pt-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-gray-400">Date de prise en compte (bilans/classements)</p>
                <p className="font-medium text-gray-900">
                  {new Date(pkg.count_date ?? pkg.created_at).toLocaleDateString('fr-FR')}
                  {pkg.count_date && (
                    <span className="ml-2 text-xs font-normal text-amber-600">
                      (corrigée, au lieu du {new Date(pkg.created_at).toLocaleDateString('fr-FR')})
                    </span>
                  )}
                </p>
              </div>
              <button
                onClick={() => setEditingCountDate(true)}
                className="flex shrink-0 items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
              >
                <Pencil className="h-3.5 w-3.5" /> Modifier
              </button>
            </div>
          </div>
        )}
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

      {editing && (
        <EditPackageModal
          pkg={pkg}
          onClose={() => setEditing(false)}
          onSaved={async () => {
            setEditing(false)
            await refresh()
          }}
        />
      )}

      {editingCountDate && (
        <CountDateModal
          pkg={pkg}
          onClose={() => setEditingCountDate(false)}
          onSaved={async () => {
            setEditingCountDate(false)
            await refresh()
          }}
        />
      )}

      {editingCreatedAt && (
        <CreatedAtModal
          pkg={pkg}
          onClose={() => setEditingCreatedAt(false)}
          onSaved={async () => {
            setEditingCreatedAt(false)
            await refresh()
          }}
        />
      )}

      {deleting && (
        <DeletePackageModal
          pkg={pkg}
          onClose={() => setDeleting(false)}
          onDeleted={() => navigate('/admin/packages')}
        />
      )}

      {purging && (
        <PurgePackageModal
          pkg={pkg}
          onClose={() => setPurging(false)}
          onPurged={() => navigate('/admin/trash')}
        />
      )}
    </div>
  )
}

function DeletePackageModal({
  pkg,
  onClose,
  onDeleted,
}: {
  pkg: Package
  onClose: () => void
  onDeleted: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    setLoading(true)
    setError(null)
    try {
      await softDeletePackage(pkg.id)
      onDeleted()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
      setLoading(false)
    }
  }

  return (
    <Modal title="Supprimer ce colis" onClose={onClose}>
      <p className="mb-4 text-gray-600">
        Confirmez-vous la suppression du colis{' '}
        <strong>{pkg.external_reference || pkg.tracking_number}</strong> ? Il sera déplacé vers la
        corbeille et pourra être restauré à tout moment.
      </p>
      {error && <p className="mb-3 text-sm font-medium text-red-600">{error}</p>}
      <div className="flex gap-3">
        <Button variant="secondary" className="flex-1" onClick={onClose}>
          Annuler
        </Button>
        <Button variant="danger" className="flex-1" loading={loading} onClick={handleDelete}>
          Supprimer
        </Button>
      </div>
    </Modal>
  )
}

function CountDateModal({
  pkg,
  onClose,
  onSaved,
}: {
  pkg: Package
  onClose: () => void
  onSaved: () => void
}) {
  const [value, setValue] = useState((pkg.count_date ?? pkg.created_at).slice(0, 10))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await setCountDate(pkg.id, new Date(`${value}T00:00:00`).toISOString())
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
      setLoading(false)
    }
  }

  async function handleReset() {
    setLoading(true)
    setError(null)
    try {
      await setCountDate(pkg.id, null)
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
      setLoading(false)
    }
  }

  return (
    <Modal title="Date de prise en compte" onClose={onClose} centered>
      <p className="mb-4 text-sm text-gray-600">
        Ce colis a été relivré après un retour. Choisissez la date à laquelle il doit compter dans
        les bilans et le classement des livreurs, à la place de sa date d'enregistrement (
        {new Date(pkg.created_at).toLocaleDateString('fr-FR')}).
      </p>
      <form onSubmit={handleSubmit}>
        <Field label="Date de prise en compte">
          <Input type="date" required value={value} onChange={(e) => setValue(e.target.value)} />
        </Field>
        {error && <p className="mb-3 text-sm font-medium text-red-600">{error}</p>}
        <div className="flex gap-3">
          {pkg.count_date && (
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              loading={loading}
              onClick={handleReset}
            >
              Réinitialiser
            </Button>
          )}
          <Button type="submit" className="flex-1" loading={loading}>
            Enregistrer
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function CreatedAtModal({
  pkg,
  onClose,
  onSaved,
}: {
  pkg: Package
  onClose: () => void
  onSaved: () => void
}) {
  const [value, setValue] = useState(pkg.created_at.slice(0, 10))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await setCreatedAt(pkg.id, new Date(`${value}T00:00:00`).toISOString())
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
      setLoading(false)
    }
  }

  return (
    <Modal title="Modifier la date de création" onClose={onClose} centered>
      <p className="mb-4 text-sm text-gray-600">
        Corrige la date d'enregistrement de ce colis (erreur de saisie, import…). Réservé aux super
        admins — cette date est utilisée partout où aucune date de prise en compte n'est définie.
      </p>
      <form onSubmit={handleSubmit}>
        <Field label="Date de création">
          <Input type="date" required value={value} onChange={(e) => setValue(e.target.value)} />
        </Field>
        {error && <p className="mb-3 text-sm font-medium text-red-600">{error}</p>}
        <Button type="submit" className="w-full" loading={loading}>
          Enregistrer
        </Button>
      </form>
    </Modal>
  )
}

function PurgePackageModal({
  pkg,
  onClose,
  onPurged,
}: {
  pkg: Package
  onClose: () => void
  onPurged: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handlePurge() {
    setLoading(true)
    setError(null)
    try {
      await purgePackage(pkg.id)
      onPurged()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
      setLoading(false)
    }
  }

  return (
    <Modal title="Supprimer définitivement ce colis" onClose={onClose}>
      <p className="mb-4 text-gray-600">
        Confirmez-vous la suppression définitive du colis{' '}
        <strong>{pkg.external_reference || pkg.tracking_number}</strong> ? Son historique sera
        également supprimé. Cette action est irréversible et ne pourra pas être annulée.
      </p>
      {error && <p className="mb-3 text-sm font-medium text-red-600">{error}</p>}
      <div className="flex gap-3">
        <Button variant="secondary" className="flex-1" onClick={onClose}>
          Annuler
        </Button>
        <Button variant="danger" className="flex-1" loading={loading} onClick={handlePurge}>
          Supprimer définitivement
        </Button>
      </div>
    </Modal>
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

function EditPackageModal({
  pkg,
  onClose,
  onSaved,
}: {
  pkg: Package
  onClose: () => void
  onSaved: () => void
}) {
  const { profile } = useAuth()
  const { companies: agentCompanies } = useGare()
  const isSuperAdmin = profile?.role === 'SUPER_ADMIN'
  const [companies, setCompanies] = useState<Company[]>([])
  const [agents, setAgents] = useState<GareAgent[]>([])
  const [form, setForm] = useState<CreatePackageInput>({
    company_id: pkg.company_id,
    agent_id: pkg.agent_id ?? '',
    external_reference: pkg.external_reference ?? '',
    sender_name: pkg.sender_name ?? '',
    sender_phone: pkg.sender_phone ?? '',
    recipient_name: pkg.recipient_name,
    recipient_phone: pkg.recipient_phone,
    delivery_address: pkg.delivery_address,
    description: pkg.description ?? '',
    price: pkg.price ?? undefined,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isSuperAdmin) listCompanies().then(setCompanies)
    listGareAgents().then(setAgents)
  }, [isSuperAdmin])

  const companyOptions = isSuperAdmin ? companies : agentCompanies

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await updatePackage(pkg.id, {
        ...form,
        agent_id: form.agent_id || undefined,
        external_reference: form.external_reference || undefined,
        sender_name: form.sender_name || undefined,
        sender_phone: form.sender_phone || undefined,
        description: form.description || undefined,
      })
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title="Modifier le colis" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <Field label="Compagnie">
          <Select
            required
            value={form.company_id}
            onChange={(e) => setForm({ ...form, company_id: e.target.value })}
          >
            {companyOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Agent de la gare (facultatif)">
          <Select
            value={form.agent_id}
            onChange={(e) => setForm({ ...form, agent_id: e.target.value })}
          >
            <option value="">Non renseigné</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
                {a.phone ? ` — ${a.phone}` : ''}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Tarif de la livraison">
          <Select
            required
            value={form.price ?? ''}
            onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
          >
            <option value="">Sélectionner…</option>
            {PRICE_OPTIONS.map((p) => (
              <option key={p} value={p}>
                {p} F
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Code colis (facultatif)">
          <Input
            value={form.external_reference}
            onChange={(e) => setForm({ ...form, external_reference: e.target.value })}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Expéditeur — nom (facultatif)">
            <Input
              value={form.sender_name}
              onChange={(e) => setForm({ ...form, sender_name: e.target.value })}
            />
          </Field>
          <Field label="Expéditeur — téléphone (facultatif)">
            <Input
              value={form.sender_phone}
              onChange={(e) => setForm({ ...form, sender_phone: e.target.value })}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Destinataire — nom">
            <Input
              required
              value={form.recipient_name}
              onChange={(e) => setForm({ ...form, recipient_name: e.target.value })}
            />
          </Field>
          <Field label="Destinataire — téléphone">
            <Input
              required
              value={form.recipient_phone}
              onChange={(e) => setForm({ ...form, recipient_phone: e.target.value })}
            />
          </Field>
        </div>

        <Field label="Adresse de livraison">
          <Input
            required
            value={form.delivery_address}
            onChange={(e) => setForm({ ...form, delivery_address: e.target.value })}
          />
        </Field>

        <Field label="Description du colis">
          <Textarea
            rows={2}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </Field>

        {error && <p className="mb-3 text-sm font-medium text-red-600">{error}</p>}
        <Button type="submit" loading={loading} className="w-full">
          Enregistrer les modifications
        </Button>
      </form>
    </Modal>
  )
}
