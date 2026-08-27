import { useEffect, useState } from 'react'
import { Plus, Building2, Trash2, ShieldCheck } from 'lucide-react'
import {
  listAgents,
  getAgentCompanies,
  setAgentCompanies,
  setAgentCanDeletePackages,
} from '../../services/agents'
import { listCompanies } from '../../services/companies'
import { createUser, deleteUser } from '../../services/admin'
import { listSuperAdmins, promoteToSuperAdmin } from '../../services/superAdmins'
import { useAuth } from '../../hooks/useAuth'
import type { Company, Profile } from '../../types/database'
import { PageLoader } from '../../components/ui/PageLoader'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { Field, Input } from '../../components/ui/Field'

export default function AdminAgents() {
  const [agents, setAgents] = useState<Profile[] | null>(null)
  const [agentCompanies, setAgentCompaniesMap] = useState<Record<string, Company[]>>({})
  const [superAdmins, setSuperAdmins] = useState<Profile[] | null>(null)
  const [creating, setCreating] = useState(false)
  const [creatingAdmin, setCreatingAdmin] = useState(false)
  const [assigning, setAssigning] = useState<Profile | null>(null)
  const [promoting, setPromoting] = useState<Profile | null>(null)
  const [deleting, setDeleting] = useState<{ profile: Profile; roleLabel: string } | null>(null)

  async function refresh() {
    const [list, admins] = await Promise.all([listAgents(), listSuperAdmins()])
    setAgents(list)
    setSuperAdmins(admins)
    const entries = await Promise.all(
      list.map(async (a) => [a.id, await getAgentCompanies(a.id)] as const),
    )
    setAgentCompaniesMap(Object.fromEntries(entries))
  }

  useEffect(() => {
    refresh()
  }, [])

  if (!agents || !superAdmins) return <PageLoader />

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

      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="px-4 py-3 font-medium">Nom</th>
              <th className="px-4 py-3 font-medium">Téléphone</th>
              <th className="px-4 py-3 font-medium">Compagnies assignées</th>
              <th className="px-4 py-3 font-medium">Peut supprimer un colis</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {agents.map((a) => (
              <tr key={a.id}>
                <td className="px-4 py-3 font-medium text-gray-900">{a.name}</td>
                <td className="px-4 py-3 text-gray-600">{a.phone || '—'}</td>
                <td className="px-4 py-3 text-gray-600">
                  {agentCompanies[a.id]?.length
                    ? agentCompanies[a.id].map((c) => c.name).join(', ')
                    : '— aucune —'}
                </td>
                <td className="px-4 py-3">
                  <DeletePermissionToggle
                    agent={a}
                    onChanged={(canDelete) =>
                      setAgents((prev) =>
                        prev
                          ? prev.map((p) =>
                              p.id === a.id ? { ...p, can_delete_packages: canDelete } : p,
                            )
                          : prev,
                      )
                    }
                  />
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
                      onClick={() => setPromoting(a)}
                      className="flex items-center gap-1 text-sm font-medium text-amber-600 hover:underline"
                    >
                      <ShieldCheck className="h-4 w-4" /> Promouvoir
                    </button>
                    <button
                      onClick={() => setDeleting({ profile: a, roleLabel: "l'agent Wintrack" })}
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
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  Aucun agent Wintrack pour le moment.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mb-4 mt-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Super administrateurs</h2>
          <p className="text-sm text-gray-500">
            Accès complet à toutes les compagnies, colis, livreurs et finances.
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={() => setCreatingAdmin(true)}
          className="w-full sm:w-auto"
        >
          <Plus className="h-4 w-4" /> Nouveau super administrateur
        </Button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="px-4 py-3 font-medium">Nom</th>
              <th className="px-4 py-3 font-medium">Téléphone</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {superAdmins.map((a) => (
              <tr key={a.id}>
                <td className="px-4 py-3 font-medium text-gray-900">{a.name}</td>
                <td className="px-4 py-3 text-gray-600">{a.phone || '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => setDeleting({ profile: a, roleLabel: 'super administrateur' })}
                      className="flex items-center gap-1 text-sm font-medium text-red-600 hover:underline"
                    >
                      <Trash2 className="h-4 w-4" /> Supprimer
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {superAdmins.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-gray-400">
                  Aucun super administrateur pour le moment.
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

      {creatingAdmin && (
        <CreateSuperAdminModal
          onClose={() => setCreatingAdmin(false)}
          onSaved={async () => {
            setCreatingAdmin(false)
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

      {promoting && (
        <PromoteModal
          agent={promoting}
          onClose={() => setPromoting(null)}
          onPromoted={async () => {
            setPromoting(null)
            await refresh()
          }}
        />
      )}

      {deleting && (
        <DeleteAccountModal
          profile={deleting.profile}
          roleLabel={deleting.roleLabel}
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

function DeletePermissionToggle({
  agent,
  onChanged,
}: {
  agent: Profile
  onChanged: (canDelete: boolean) => void
}) {
  const [loading, setLoading] = useState(false)

  async function handleToggle() {
    const next = !agent.can_delete_packages
    setLoading(true)
    try {
      await setAgentCanDeletePackages(agent.id, next)
      onChanged(next)
    } finally {
      setLoading(false)
    }
  }

  return (
    <label className="flex items-center gap-2">
      <input
        type="checkbox"
        checked={agent.can_delete_packages}
        disabled={loading}
        onChange={handleToggle}
        className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
      />
      <span className="text-sm text-gray-600">
        {agent.can_delete_packages ? 'Oui' : 'Non'}
      </span>
    </label>
  )
}

function DeleteAccountModal({
  profile,
  roleLabel,
  onClose,
  onDeleted,
}: {
  profile: Profile
  roleLabel: string
  onClose: () => void
  onDeleted: () => void
}) {
  const { profile: me } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isSelf = me?.id === profile.id

  async function handleDelete() {
    setLoading(true)
    setError(null)
    try {
      await deleteUser(profile.user_id)
      onDeleted()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title={`Supprimer ${roleLabel}`} onClose={onClose}>
      {isSelf ? (
        <p className="mb-4 text-gray-600">
          Vous ne pouvez pas supprimer votre propre compte.
        </p>
      ) : (
        <p className="mb-4 text-gray-600">
          Confirmez-vous la suppression définitive du compte de <strong>{profile.name}</strong> ? Il
          ne pourra plus se connecter à l'application.
        </p>
      )}
      {error && <p className="mb-3 text-sm font-medium text-red-600">{error}</p>}
      <div className="flex gap-3">
        <Button variant="secondary" className="flex-1" onClick={onClose}>
          Annuler
        </Button>
        {!isSelf && (
          <Button variant="danger" className="flex-1" loading={loading} onClick={handleDelete}>
            Supprimer
          </Button>
        )}
      </div>
    </Modal>
  )
}

function PromoteModal({
  agent,
  onClose,
  onPromoted,
}: {
  agent: Profile
  onClose: () => void
  onPromoted: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handlePromote() {
    setLoading(true)
    setError(null)
    try {
      await promoteToSuperAdmin(agent.id)
      onPromoted()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title="Promouvoir en super administrateur" onClose={onClose}>
      <p className="mb-4 text-gray-600">
        <strong>{agent.name}</strong> obtiendra un accès complet à toutes les compagnies, colis,
        livreurs et finances, et perdra son statut d'agent Wintrack (ses compagnies assignées seront
        retirées). Cette action est irréversible depuis l'interface.
      </p>
      {error && <p className="mb-3 text-sm font-medium text-red-600">{error}</p>}
      <div className="flex gap-3">
        <Button variant="secondary" className="flex-1" onClick={onClose}>
          Annuler
        </Button>
        <Button className="flex-1" loading={loading} onClick={handlePromote}>
          Promouvoir
        </Button>
      </div>
    </Modal>
  )
}

function CreateSuperAdminModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
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
      await createUser({ email, password, name, phone, role: 'SUPER_ADMIN' })
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title="Nouveau super administrateur" onClose={onClose}>
      <p className="mb-4 text-sm text-gray-500">
        Ce compte aura un accès complet à toutes les compagnies, colis, livreurs et finances.
      </p>
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
          Créer le super administrateur
        </Button>
      </form>
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
