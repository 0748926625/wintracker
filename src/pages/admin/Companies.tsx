import { useEffect, useState } from 'react'
import { Plus, UserPlus, Trash2 } from 'lucide-react'
import {
  listCompanies,
  createCompany,
  updateCompany,
  deleteCompany,
  setCommissionTiers,
  getCommissionTiers,
  type CompanyInput,
} from '../../services/companies'
import { listCompanyGroups, createCompanyGroup } from '../../services/groups'
import { createUser } from '../../services/admin'
import {
  COMMISSION_TYPE_LABELS,
  PRICE_OPTIONS,
  type CommissionType,
  type Company,
  type CompanyGroup,
} from '../../types/database'
import { PageLoader } from '../../components/ui/PageLoader'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { Field, Input, Select } from '../../components/ui/Field'

export default function AdminCompanies() {
  const [companies, setCompanies] = useState<Company[] | null>(null)
  const [editing, setEditing] = useState<Company | 'new' | null>(null)
  const [userFor, setUserFor] = useState<Company | null>(null)
  const [deleting, setDeleting] = useState<Company | null>(null)

  async function refresh() {
    setCompanies(await listCompanies())
  }

  useEffect(() => {
    refresh()
  }, [])

  if (!companies) return <PageLoader />

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Compagnies</h1>
        <Button onClick={() => setEditing('new')} className="w-full sm:w-auto">
          <Plus className="h-4 w-4" /> Nouvelle compagnie
        </Button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="px-4 py-3 font-medium">Nom</th>
              <th className="hidden px-4 py-3 font-medium sm:table-cell">Groupe</th>
              <th className="hidden px-4 py-3 font-medium md:table-cell">Commission</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {companies.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                <td className="hidden px-4 py-3 text-gray-600 sm:table-cell">
                  {c.group?.name || '—'}
                </td>
                <td className="hidden px-4 py-3 text-gray-600 md:table-cell">
                  {c.commission_type ? COMMISSION_TYPE_LABELS[c.commission_type] : '—'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => setUserFor(c)}
                      className="flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline"
                    >
                      <UserPlus className="h-4 w-4" /> Utilisateur
                    </button>
                    <button
                      onClick={() => setEditing(c)}
                      className="text-sm font-medium text-gray-600 hover:underline"
                    >
                      Modifier
                    </button>
                    <button
                      onClick={() => setDeleting(c)}
                      className="flex items-center gap-1 text-sm font-medium text-red-600 hover:underline"
                    >
                      <Trash2 className="h-4 w-4" /> Supprimer
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {companies.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                  Aucune compagnie pour le moment.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <CompanyModal
          company={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null)
            await refresh()
          }}
        />
      )}

      {userFor && (
        <CompanyUserModal
          company={userFor}
          onClose={() => setUserFor(null)}
          onSaved={() => setUserFor(null)}
        />
      )}

      {deleting && (
        <DeleteCompanyModal
          company={deleting}
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

function DeleteCompanyModal({
  company,
  onClose,
  onDeleted,
}: {
  company: Company
  onClose: () => void
  onDeleted: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    setLoading(true)
    setError(null)
    try {
      await deleteCompany(company.id)
      onDeleted()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title="Supprimer la compagnie" onClose={onClose}>
      <p className="mb-4 text-gray-600">
        Confirmez-vous la suppression définitive de <strong>{company.name}</strong> ?
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

function CompanyModal({
  company,
  onClose,
  onSaved,
}: {
  company: Company | null
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState<CompanyInput>({
    name: company?.name ?? '',
    phone: company?.phone ?? '',
    email: company?.email ?? '',
    address: company?.address ?? '',
    group_id: company?.group_id ?? '',
    commission_type: company?.commission_type ?? null,
    commission_rate: company?.commission_rate ?? undefined,
  })
  const [groups, setGroups] = useState<CompanyGroup[]>([])
  const [newGroupName, setNewGroupName] = useState('')
  const [tiers, setTiers] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    listCompanyGroups().then(setGroups)
    if (company) {
      getCommissionTiers(company.id).then((existing) => {
        const map: Record<number, string> = {}
        for (const t of existing) map[t.price] = String(t.amount)
        setTiers(map)
      })
    }
  }, [company])

  async function handleAddGroup() {
    if (!newGroupName.trim()) return
    const created = await createCompanyGroup(newGroupName.trim())
    setGroups((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))
    setForm({ ...form, group_id: created.id })
    setNewGroupName('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const payload: CompanyInput = {
        ...form,
        group_id: form.group_id || null,
        commission_rate: form.commission_type === 'RATE' ? form.commission_rate : null,
      }
      const saved = company ? await updateCompany(company.id, payload) : await createCompany(payload)

      if (form.commission_type === 'FIXED_PER_TIER') {
        await setCommissionTiers(
          saved.id,
          PRICE_OPTIONS.filter((p) => tiers[p]).map((p) => ({ price: p, amount: Number(tiers[p]) })),
        )
      } else if (company) {
        await setCommissionTiers(saved.id, [])
      }

      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title={company ? 'Modifier la compagnie' : 'Nouvelle compagnie'} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <Field label="Nom">
          <Input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </Field>
        <Field label="Téléphone">
          <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </Field>
        <Field label="Email">
          <Input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </Field>
        <Field label="Adresse">
          <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        </Field>

        <Field label="Groupe (facultatif)">
          <Select
            value={form.group_id ?? ''}
            onChange={(e) => setForm({ ...form, group_id: e.target.value })}
          >
            <option value="">Aucun</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </Select>
          <div className="mt-2 flex gap-2">
            <Input
              placeholder="Nouveau groupe…"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
            />
            <Button type="button" variant="secondary" onClick={handleAddGroup} className="!px-3 !py-2 text-sm">
              Ajouter
            </Button>
          </div>
        </Field>

        <Field label="Mode de commission (gains de la compagnie)">
          <Select
            value={form.commission_type ?? ''}
            onChange={(e) =>
              setForm({ ...form, commission_type: (e.target.value || null) as CommissionType | null })
            }
          >
            <option value="">Aucune commission</option>
            {(Object.entries(COMMISSION_TYPE_LABELS) as [CommissionType, string][]).map(
              ([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ),
            )}
          </Select>
        </Field>

        {form.commission_type === 'RATE' && (
          <Field label="Taux (%)">
            <Input
              type="number"
              min={0}
              max={100}
              step={0.5}
              required
              value={form.commission_rate ?? ''}
              onChange={(e) => setForm({ ...form, commission_rate: Number(e.target.value) })}
            />
          </Field>
        )}

        {form.commission_type === 'FIXED_PER_TIER' && (
          <Field label="Montant par palier de tarif (F)">
            <div className="grid grid-cols-2 gap-2">
              {PRICE_OPTIONS.map((p) => (
                <div key={p} className="flex items-center gap-2">
                  <span className="w-16 shrink-0 text-sm text-gray-500">{p} F →</span>
                  <Input
                    type="number"
                    min={0}
                    value={tiers[p] ?? ''}
                    onChange={(e) => setTiers({ ...tiers, [p]: e.target.value })}
                  />
                </div>
              ))}
            </div>
          </Field>
        )}

        {error && <p className="mb-3 text-sm font-medium text-red-600">{error}</p>}
        <Button type="submit" loading={loading} className="w-full">
          Enregistrer
        </Button>
      </form>
    </Modal>
  )
}

function CompanyUserModal({
  company,
  onClose,
  onSaved,
}: {
  company: Company
  onClose: () => void
  onSaved: () => void
}) {
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
      await createUser({
        email,
        password,
        name,
        phone,
        role: 'COMPANY_USER',
        company_id: company.id,
      })
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title={`Utilisateur pour ${company.name}`} onClose={onClose}>
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
          Créer l'utilisateur
        </Button>
      </form>
    </Modal>
  )
}
