import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { listAgents } from '../../services/agents'
import { createUser } from '../../services/admin'
import type { Profile } from '../../types/database'
import { PageLoader } from '../../components/ui/PageLoader'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { Field, Input } from '../../components/ui/Field'

export default function AdminAgents() {
  const [agents, setAgents] = useState<Profile[] | null>(null)
  const [creating, setCreating] = useState(false)

  async function refresh() {
    setAgents(await listAgents())
  }

  useEffect(() => {
    refresh()
  }, [])

  if (!agents) return <PageLoader />

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Agents Wintrack</h1>
        <Button onClick={() => setCreating(true)} className="!px-3 !py-2 text-sm">
          <Plus className="h-4 w-4" /> Nouvel agent Wintrack
        </Button>
      </div>

      <p className="mb-4 text-sm text-gray-500">
        Personnel Winner Express en gare : peut créer des colis et les affecter à un livreur, sans
        accès à la gestion des compagnies ni des livreurs.
      </p>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="px-4 py-3 font-medium">Nom</th>
              <th className="px-4 py-3 font-medium">Téléphone</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {agents.map((a) => (
              <tr key={a.id}>
                <td className="px-4 py-3 font-medium text-gray-900">{a.name}</td>
                <td className="px-4 py-3 text-gray-600">{a.phone || '—'}</td>
              </tr>
            ))}
            {agents.length === 0 && (
              <tr>
                <td colSpan={2} className="px-4 py-8 text-center text-gray-400">
                  Aucun agent Wintrack pour le moment.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {creating && (
        <CreateAgentModal
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

function CreateAgentModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
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
      await createUser({ email, password, name, phone, role: 'AGENT' })
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title="Nouvel agent Wintrack" onClose={onClose}>
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
          Créer l'agent Wintrack
        </Button>
      </form>
    </Modal>
  )
}
