import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Trophy, Trash2 } from 'lucide-react'
import { listDrivers, updateDriverStatus } from '../../services/drivers'
import { listAllPackages } from '../../services/packages'
import { createUser, deleteUser } from '../../services/admin'
import { useRealtimePackages } from '../../hooks/useRealtimePackages'
import { usePeriodFilter } from '../../hooks/usePeriodFilter'
import type { Driver } from '../../types/database'
import { PageLoader } from '../../components/ui/PageLoader'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { Field, Input } from '../../components/ui/Field'
import { PeriodSwitcher } from '../../components/ui/PeriodSwitcher'

export default function AdminDrivers() {
  const [drivers, setDrivers] = useState<Driver[] | null>(null)
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState<Driver | null>(null)
  const pf = usePeriodFilter()
  const packagesFetcher = useCallback(() => listAllPackages(), [])
  const { packages } = useRealtimePackages(packagesFetcher, 'all', 'all')

  async function refresh() {
    setDrivers(await listDrivers())
  }

  useEffect(() => {
    refresh()
  }, [])

  async function toggleStatus(driver: Driver) {
    await updateDriverStatus(driver.id, driver.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE')
    await refresh()
  }

  if (!drivers) return <PageLoader />

  const leaderboard = drivers
    .map((d) => {
      const livres = packages.filter(
        (p) => p.driver_id === d.id && p.status === 'LIVRE' && pf.inRange(p.created_at),
      )
      return {
        driver: d,
        delivered: livres.length,
        cash: livres.reduce((sum, p) => sum + (p.price ?? 0), 0),
      }
    })
    .filter((row) => row.delivered > 0)
    .sort((a, b) => b.cash - a.cash)
    .slice(0, 5)

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Livreurs</h1>
        <Button onClick={() => setCreating(true)} className="w-full sm:w-auto">
          <Plus className="h-4 w-4" /> Nouveau livreur
        </Button>
      </div>

      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-4">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="flex items-center gap-2 font-semibold text-gray-900">
            <Trophy className="h-4 w-4 text-amber-500" /> Meilleurs livreurs
          </h2>
          <PeriodSwitcher pf={pf} />
        </div>
        {leaderboard.length === 0 ? (
          <p className="py-4 text-center text-sm text-gray-400">
            Aucune livraison sur cette période.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {leaderboard.map((row, i) => (
              <li key={row.driver.id} className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-500">
                    {i + 1}
                  </span>
                  <Link
                    to={`/admin/drivers/${row.driver.id}`}
                    className="font-medium text-gray-900 hover:text-brand-600"
                  >
                    {row.driver.profile?.name}
                  </Link>
                </div>
                <div className="text-right text-sm">
                  <div className="font-semibold text-brand-600">{row.cash.toLocaleString('fr-FR')} F</div>
                  <div className="text-xs text-gray-400">{row.delivered} livré(s)</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="px-4 py-3 font-medium">Nom</th>
              <th className="px-4 py-3 font-medium">Téléphone</th>
              <th className="px-4 py-3 font-medium">Statut</th>
              <th className="px-4 py-3 font-medium">Colis affectés</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {drivers.map((d) => (
              <tr key={d.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <Link
                    to={`/admin/drivers/${d.id}`}
                    className="block font-medium text-gray-900 hover:text-brand-600"
                  >
                    {d.profile?.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-600">{d.profile?.phone || '—'}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      d.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {d.status === 'ACTIVE' ? 'Actif' : 'Inactif'}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600">{d.active_packages_count}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => toggleStatus(d)}
                      className="text-sm font-medium text-brand-600 hover:underline"
                    >
                      {d.status === 'ACTIVE' ? 'Désactiver' : 'Activer'}
                    </button>
                    <button
                      onClick={() => setDeleting(d)}
                      className="flex items-center gap-1 text-sm font-medium text-red-600 hover:underline"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Supprimer
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {drivers.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  Aucun livreur pour le moment.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {creating && (
        <CreateDriverModal
          onClose={() => setCreating(false)}
          onSaved={async () => {
            setCreating(false)
            await refresh()
          }}
        />
      )}

      {deleting && (
        <DeleteDriverModal
          driver={deleting}
          onClose={() => setDeleting(null)}
          onDeleted={async () => {
            setDeleting(null)
            await refresh()
          }}
        />
      )}
    </div>
  )
}

function DeleteDriverModal({
  driver,
  onClose,
  onDeleted,
}: {
  driver: Driver
  onClose: () => void
  onDeleted: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    if (!driver.profile) return
    setLoading(true)
    setError(null)
    try {
      await deleteUser(driver.profile.user_id)
      onDeleted()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title="Supprimer le livreur" onClose={onClose}>
      <p className="mb-4 text-gray-600">
        Confirmez-vous la suppression définitive du compte de <strong>{driver.profile?.name}</strong> ?
        Il ne pourra plus se connecter à l'application, et les colis déjà livrés par lui perdront leur
        attribution (ils n'apparaîtront plus dans son historique ni dans le classement des meilleurs
        livreurs). Préférez « Désactiver » si vous voulez seulement l'empêcher de se connecter en
        conservant l'historique.
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

function emailFromPhone(phone: string) {
  const digits = phone.replace(/\D/g, '')
  return `${digits}@wintracker.local`
}

function CreateDriverModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState<{ email: string } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const digits = phone.replace(/\D/g, '')
    if (!digits) {
      setError('Numéro de téléphone invalide.')
      return
    }
    setLoading(true)
    try {
      const email = emailFromPhone(phone)
      await createUser({ email, password, name, phone, role: 'DRIVER' })
      setCreated({ email })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  if (created) {
    return (
      <Modal title="Livreur créé" onClose={onSaved}>
        <p className="mb-4 text-gray-600">
          Communiquez ces identifiants de connexion au livreur :
        </p>
        <div className="mb-4 space-y-2 rounded-xl bg-gray-50 p-3 text-sm">
          <p>
            <span className="text-gray-500">Email : </span>
            <span className="font-medium text-gray-900">{created.email}</span>
          </p>
          <p>
            <span className="text-gray-500">Mot de passe : </span>
            <span className="font-medium text-gray-900">{password}</span>
          </p>
        </div>
        <Button className="w-full" onClick={onSaved}>
          Terminer
        </Button>
      </Modal>
    )
  }

  return (
    <Modal title="Nouveau livreur" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <Field label="Nom complet">
          <Input required value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Téléphone">
          <Input
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Sert d'identifiant de connexion"
          />
        </Field>
        <Field label="Mot de passe temporaire">
          <Input
            type="text"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        {error && <p className="mb-3 text-sm font-medium text-red-600">{error}</p>}
        <Button type="submit" loading={loading} className="w-full">
          Créer le livreur
        </Button>
      </form>
    </Modal>
  )
}
