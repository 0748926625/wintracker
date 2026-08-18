import { useEffect, useState } from 'react'
import { Plus, UserPlus, Trash2, AlertTriangle } from 'lucide-react'
import {
  listCompanies,
  createCompany,
  updateCompany,
  deleteCompany,
  setCommissionTiers,
  getCommissionTiers,
  listCompanyUsers,
  type CompanyInput,
} from '../../services/companies'
import { listCompanyPackages, deleteCompanyPackages } from '../../services/packages'
import { listCompanyGroups, createCompanyGroup } from '../../services/groups'
import { createUser, deleteUser } from '../../services/admin'
import {
  COMMISSION_TYPE_LABELS,
  PRICE_OPTIONS,
  type CommissionType,
  type Company,
  type CompanyGroup,
  type Profile,
} from '../../types/database'
import { PageLoader } from '../../components/ui/PageLoader'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { Field, Input, Select } from '../../components/ui/Field'

function commissionPerPackage(c: Company): string {
  if (c.commission_type === 'RATE') {
    return c.commission_rate != null ? `${c.commission_rate} % / colis` : '—'
  }
  if (c.commission_type === 'FIXED_PER_TIER') {
    const tiers = c.commission_tiers ?? []
    if (tiers.length === 0) return '—'
    return tiers
      .slice()
      .sort((a, b) => a.price - b.price)
      .map((t) => `${t.price}F→${t.amount}F`)
      .join(' · ')
  }
  return '—'
}

export default function AdminCompanies() {
  const [companies, setCompanies] = useState<Company[] | null>(null)
  const [companyUsers, setCompanyUsers] = useState<Record<string, Profile[]>>({})
  const [editing, setEditing] = useState<Company | 'new' | null>(null)
  const [userFor, setUserFor] = useState<Company | null>(null)
  const [deleting, setDeleting] = useState<Company | null>(null)
  const [deletingUser, setDeletingUser] = useState<Profile | null>(null)

  async function refresh() {
    const list = await listCompanies()
    setCompanies(list)
    const entries = await Promise.all(
      list.map(async (c) => [c.id, await listCompanyUsers(c.id)] as const),
    )
    setCompanyUsers(Object.fromEntries(entries))
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

      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="px-4 py-3 font-medium">Nom</th>
              <th className="px-4 py-3 font-medium">Groupe</th>
              <th className="px-4 py-3 font-medium">Commission par colis</th>
              <th className="px-4 py-3 font-medium">Utilisateur(s)</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {companies.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                <td className="px-4 py-3 text-gray-600">{c.group?.name || '—'}</td>
                <td className="px-4 py-3 text-gray-600">{commissionPerPackage(c)}</td>
                <td className="px-4 py-3 text-gray-600">
                  {companyUsers[c.id]?.length ? (
                    <ul className="space-y-1">
                      {companyUsers[c.id].map((u) => (
                        <li key={u.id} className="flex items-center gap-1.5">
                          <span>{u.name}</span>
                          <button
                            onClick={() => setDeletingUser(u)}
                            title="Supprimer ce compte"
                            className="text-gray-400 hover:text-red-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    '— aucun —'
                  )}
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
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
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
          onSaved={async () => {
            setUserFor(null)
            await refresh()
          }}
        />
      )}

      {deleting && (
        <DeleteCompanyModal
          company={deleting}
          companyUsers={companyUsers[deleting.id] ?? []}
          onClose={() => setDeleting(null)}
          onDeleted={async () => {
            setDeleting(null)
            await refresh()
          }}
        />
      )}

      {deletingUser && (
        <DeleteCompanyUserModal
          user={deletingUser}
          onClose={() => setDeletingUser(null)}
          onDeleted={async () => {
            setDeletingUser(null)
            await refresh()
          }}
        />
      )}
    </div>
  )
}

function DeleteCompanyUserModal({
  user,
  onClose,
  onDeleted,
}: {
  user: Profile
  onClose: () => void
  onDeleted: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    setLoading(true)
    setError(null)
    try {
      await deleteUser(user.user_id)
      onDeleted()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title="Supprimer le compte" onClose={onClose}>
      <p className="mb-4 text-gray-600">
        Confirmez-vous la suppression définitive du compte de <strong>{user.name}</strong> ? Il ne
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

const FORCE_DELETE_PASSWORD = 'Amouréternel!'

function DeleteCompanyModal({
  company,
  companyUsers,
  onClose,
  onDeleted,
}: {
  company: Company
  companyUsers: Profile[]
  onClose: () => void
  onDeleted: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [blocked, setBlocked] = useState(false)
  const [packageCount, setPackageCount] = useState<number | null>(null)
  const [confirmPassword, setConfirmPassword] = useState('')

  async function handleDelete() {
    setLoading(true)
    setError(null)
    try {
      await deleteCompany(company.id)
      onDeleted()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur'
      if (message.includes('colis ou des utilisateurs associés')) {
        setBlocked(true)
        listCompanyPackages(company.id).then((list) => setPackageCount(list.length))
      } else {
        setError(message)
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleForceDelete() {
    setLoading(true)
    setError(null)
    try {
      for (const user of companyUsers) {
        await deleteUser(user.user_id)
      }
      await deleteCompanyPackages(company.id)
      await deleteCompany(company.id)
      onDeleted()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  if (!blocked) {
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

  return (
    <Modal title="Suppression forcée" onClose={onClose}>
      <div className="mb-4 flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3">
        <AlertTriangle className="h-5 w-5 shrink-0 text-red-600" />
        <p className="text-sm text-red-700">
          <strong>{company.name}</strong> a {packageCount ?? '…'} colis (avec tout leur historique)
          {companyUsers.length > 0 && <> et {companyUsers.length} compte(s) utilisateur</>} liés.
          Continuer supprimera <strong>tout, définitivement</strong> — action irréversible.
        </p>
      </div>
      <Field label={`Tapez "${FORCE_DELETE_PASSWORD}" pour confirmer`}>
        <Input
          type="password"
          autoComplete="off"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
      </Field>
      {error && <p className="mb-3 text-sm font-medium text-red-600">{error}</p>}
      <div className="flex gap-3">
        <Button variant="secondary" className="flex-1" onClick={onClose}>
          Annuler
        </Button>
        <Button
          variant="danger"
          className="flex-1"
          loading={loading}
          disabled={confirmPassword !== FORCE_DELETE_PASSWORD}
          onClick={handleForceDelete}
        >
          Tout supprimer
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
