import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { listDrivers, updateDriverStatus } from '../../services/drivers'
import { createUser } from '../../services/admin'
import type { Driver } from '../../types/database'
import { PageLoader } from '../../components/ui/PageLoader'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { Field, Input } from '../../components/ui/Field'

export default function AdminDrivers() {
  const [drivers, setDrivers] = useState<Driver[] | null>(null)
  const [creating, setCreating] = useState(false)

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

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Livreurs</h1>
        <Button onClick={() => setCreating(true)} className="w-full sm:w-auto">
          <Plus className="h-4 w-4" /> Nouveau livreur
        </Button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="px-4 py-3 font-medium">Nom</th>
              <th className="hidden px-4 py-3 font-medium sm:table-cell">Téléphone</th>
              <th className="px-4 py-3 font-medium">Statut</th>
              <th className="px-4 py-3 font-medium">Colis affectés</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {drivers.map((d) => (
              <tr key={d.id}>
                <td className="px-4 py-3 font-medium text-gray-900">{d.profile?.name}</td>
                <td className="hidden px-4 py-3 text-gray-600 sm:table-cell">
                  {d.profile?.phone || '—'}
                </td>
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
                  <button
                    onClick={() => toggleStatus(d)}
                    className="text-sm font-medium text-brand-600 hover:underline"
                  >
                    {d.status === 'ACTIVE' ? 'Désactiver' : 'Activer'}
                  </button>
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
    </div>
  )
}

function CreateDriverModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await createUser({ email, password, name, phone, role: 'DRIVER' })
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title="Nouveau livreur" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <Field label="Nom complet">
          <Input required value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Téléphone">
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </Field>
        <Field label="Email">
          <Input
            type="email"
            required
            autoComplete="off"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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
