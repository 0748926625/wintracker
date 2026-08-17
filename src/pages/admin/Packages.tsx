import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useRealtimePackages } from '../../hooks/useRealtimePackages'
import { listAllPackages, createPackage, type CreatePackageInput } from '../../services/packages'
import { listCompanies } from '../../services/companies'
import { listGareAgents, createGareAgent } from '../../services/gareAgents'
import { PRICE_OPTIONS, type Company, type GareAgent, type PackageStatus } from '../../types/database'
import { PageLoader } from '../../components/ui/PageLoader'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { Field, Input, Select, Textarea } from '../../components/ui/Field'

const FILTERS: { label: string; value: PackageStatus | 'TOUS' }[] = [
  { label: 'Tous', value: 'TOUS' },
  { label: 'En attente', value: 'EN_ATTENTE' },
  { label: 'Récupérés', value: 'RECUPERE' },
  { label: 'En livraison', value: 'EN_LIVRAISON' },
  { label: 'Livrés', value: 'LIVRE' },
  { label: 'Échecs', value: 'ECHEC' },
  { label: 'Retours', value: 'RETOUR' },
]

export default function AdminPackages() {
  const fetcher = useCallback(() => listAllPackages(), [])
  const { packages, loading } = useRealtimePackages(fetcher, 'all', 'all')
  const [filter, setFilter] = useState<PackageStatus | 'TOUS'>('TOUS')
  const [creating, setCreating] = useState(false)

  if (loading) return <PageLoader />

  const filtered = filter === 'TOUS' ? packages : packages.filter((p) => p.status === filter)

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Colis</h1>
        <Button onClick={() => setCreating(true)} className="w-full sm:w-auto">
          <Plus className="h-4 w-4" /> Nouveau colis
        </Button>
      </div>

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium ${
              filter === f.value ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="px-4 py-3 font-medium">Tracking</th>
              <th className="hidden px-4 py-3 font-medium sm:table-cell">Compagnie</th>
              <th className="px-4 py-3 font-medium">Destinataire</th>
              <th className="px-4 py-3 font-medium">Statut</th>
              <th className="hidden px-4 py-3 font-medium md:table-cell">Livreur</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((p) => (
              <tr key={p.id} className="cursor-pointer hover:bg-gray-50">
                <td className="px-4 py-3">
                  <Link to={`/admin/packages/${p.id}`} className="font-medium text-brand-600">
                    {p.tracking_number}
                  </Link>
                </td>
                <td className="hidden px-4 py-3 text-gray-600 sm:table-cell">{p.company?.name}</td>
                <td className="px-4 py-3 text-gray-900">{p.recipient_name}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={p.status} />
                </td>
                <td className="hidden px-4 py-3 text-gray-600 md:table-cell">
                  {p.driver?.profile?.name || '—'}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  Aucun colis.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {creating && (
        <CreatePackageModal onClose={() => setCreating(false)} onSaved={() => setCreating(false)} />
      )}
    </div>
  )
}

function lastCompanyKey(profileId: string) {
  return `wintracker:lastCompany:${profileId}`
}

function CreatePackageModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { profile } = useAuth()
  const [companies, setCompanies] = useState<Company[]>([])
  const [agents, setAgents] = useState<GareAgent[]>([])
  const [newAgentName, setNewAgentName] = useState('')
  const [newAgentPhone, setNewAgentPhone] = useState('')
  const [form, setForm] = useState<CreatePackageInput>({
    company_id: '',
    agent_id: '',
    external_reference: '',
    sender_name: '',
    sender_phone: '',
    recipient_name: '',
    recipient_phone: '',
    delivery_address: '',
    description: '',
    price: undefined,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    listCompanies().then((list) => {
      setCompanies(list)
      if (profile?.role !== 'AGENT' || list.length === 0) return

      if (list.length === 1) {
        setForm((prev) => ({ ...prev, company_id: list[0].id }))
        return
      }

      const remembered = localStorage.getItem(lastCompanyKey(profile.id))
      if (remembered && list.some((c) => c.id === remembered)) {
        setForm((prev) => ({ ...prev, company_id: remembered }))
      }
    })
    listGareAgents().then(setAgents)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleAddAgent() {
    if (!newAgentName.trim()) return
    const created = await createGareAgent({ name: newAgentName.trim(), phone: newAgentPhone.trim() })
    setAgents((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))
    setForm({ ...form, agent_id: created.id })
    setNewAgentName('')
    setNewAgentPhone('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await createPackage({ ...form, agent_id: form.agent_id || undefined })
      if (profile?.role === 'AGENT' && form.company_id) {
        localStorage.setItem(lastCompanyKey(profile.id), form.company_id)
      }
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title="Nouveau colis" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <Field label="Compagnie">
          <Select
            required
            value={form.company_id}
            onChange={(e) => setForm({ ...form, company_id: e.target.value })}
          >
            <option value="">Sélectionner…</option>
            {companies.map((c) => (
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
          <div className="mt-2 flex gap-2">
            <Input
              placeholder="Nom du nouvel agent"
              value={newAgentName}
              onChange={(e) => setNewAgentName(e.target.value)}
            />
            <Input
              placeholder="Téléphone"
              value={newAgentPhone}
              onChange={(e) => setNewAgentPhone(e.target.value)}
            />
            <Button
              type="button"
              variant="secondary"
              onClick={handleAddAgent}
              className="!px-3 !py-2 text-sm"
            >
              Ajouter
            </Button>
          </div>
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

        <Field label="Référence interne compagnie (facultatif)">
          <Input
            placeholder="ex: numéro de gare"
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
          Créer le colis
        </Button>
      </form>
    </Modal>
  )
}
