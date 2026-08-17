import { useEffect, useState } from 'react'
import { Plus, Building2, Trash2 } from 'lucide-react'
import { listAgents, getAgentCompanies, setAgentCompanies } from '../../services/agents'
import { listCompanies } from '../../services/companies'
import { createUser, deleteUser } from '../../services/admin'
import type { Company, Profile } from '../../types/database'
import { PageLoader } from '../../components/ui/PageLoader'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { Field, Input } from '../../components/ui/Field'

export default function AdminAgents() {
  const [agents, setAgents] = useState<Profile[] | null>(null)
  const [agentCompanies, setAgentCompaniesMap] = useState<Record<string, Company[]>>({})
  const [creating, setCreating] = useState(false)
  const [assigning, setAssigning] = useState<Profile | null>(null)
  const [deleting, setDeleting] = useState<Profile | null>(null)

  async function refresh() {
    const list = await listAgents()
    setAgents(list)
    const entries = await Promise.all(
      list.map(async (a) => [a.id, await getAgentCompanies(a.id)] as const),
    )
    setAgentCompaniesMap(Object.fromEntries(entries))
  }

  useEffect(() => {
    refresh()
  }, [])

  if (!agents) return <PageLoader />

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Agents Wintrack</h1>
        <Button onClick={() => setCreating(true)} className="w-full sm:w-auto">
          <Plus className="h-4 w-4" /> Nouvel agent Wintrack
        </Button>
      </div>

      <p className="mb-4 text-sm text-gray-500">
        Personnel Winner Express en gare : peut créer des colis et les affecter à un livreur pour les
        compagnies qui lui sont assignées, sans accès à la gestion des compagnies ni des livreurs. Sans
        compagnie assignée, un agent ne voit aucun colis.
      </p>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="px-4 py-3 font-medium">Nom</th>
              <th className="hidden px-4 py-3 font-medium sm:table-cell">Téléphone</th>
              <th className="px-4 py-3 font-medium">Compagnies assignées</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {agents.map((a) => (
              <tr key={a.id}>
                <td className="px-4 py-3 font-medium text-gray-900">{a.name}</td>
                <td className="hidden px-4 py-3 text-gray-600 sm:table-cell">{a.phone || '—'}</td>
                <td className="px-4 py-3 text-gray-600">
                  {agentCompanies[a.id]?.length
                    ? agentCompanies[a.id].map((c) => c.name).join(', ')
                    : '— aucune —'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => setAssigning(a)}
                      className="flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline"
                    >
                      <Building2 className="h-4 w-4" /> Compagnies
                    </button>
                    <button
                      onClick={() => setDeleting(a)}
                      className="flex items-center gap-1 text-sm font-medium text-red-600 hover:underline"
                    >
                      <Trash2 className="h-4 w-4" /> Supprimer
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {agents.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
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

      {assigning && (
        <AssignCompaniesModal
          agent={assigning}
          currentCompanies={agentCompanies[assigning.id] ?? []}
          onClose={() => setAssigning(null)}
          onSaved={async () => {
            setAssigning(null)
            await refresh()
          }}
        />
      )}

      {deleting && (
        <DeleteAgentModal
          agent={deleting}
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

function DeleteAgentModal({
  agent,
  onClose,
  onDeleted,
}: {
  agent: Profile
  onClose: () => void
  onDeleted: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    setLoading(true)
    setError(null)
    try {
      await deleteUser(agent.user_id)
      onDeleted()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title="Supprimer l'agent Wintrack" onClose={onClose}>
      <p className="mb-4 text-gray-600">
        Confirmez-vous la suppression définitive du compte de <strong>{agent.name}</strong> ? Il ne
        pourra plus se connecter à l'application.
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

function AssignCompaniesModal({
  agent,
  currentCompanies,
  onClose,
  onSaved,
}: {
  agent: Profile
  currentCompanies: Company[]
  onClose: () => void
  onSaved: () => void
}) {
  const [companies, setCompanies] = useState<Company[]>([])
  const [selected, setSelected] = useState<Set<string>>(
    new Set(currentCompanies.map((c) => c.id)),
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    listCompanies().then(setCompanies)
  }, [])

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleSave() {
    setLoading(true)
    setError(null)
    try {
      await setAgentCompanies(agent.id, Array.from(selected))
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title={`Compagnies assignées à ${agent.name}`} onClose={onClose}>
      <p className="mb-3 text-sm text-gray-500">
        Cet agent ne pourra voir et créer des colis que pour les compagnies cochées ci-dessous.
      </p>
      <div className="mb-4 max-h-64 space-y-2 overflow-y-auto">
        {companies.map((c) => (
          <label key={c.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-50">
            <input
              type="checkbox"
              checked={selected.has(c.id)}
              onChange={() => toggle(c.id)}
              className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
            />
            <span className="text-sm text-gray-900">{c.name}</span>
          </label>
        ))}
        {companies.length === 0 && (
          <p className="text-sm text-gray-400">Aucune compagnie créée pour le moment.</p>
        )}
      </div>
      {error && <p className="mb-3 text-sm font-medium text-red-600">{error}</p>}
      <Button onClick={handleSave} loading={loading} className="w-full">
        Enregistrer
      </Button>
    </Modal>
  )
}
