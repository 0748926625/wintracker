import { useEffect, useState } from 'react'
import { Plus, UserPlus, Trash2, AlertTriangle, Layers, Ungroup, X } from 'lucide-react'
import {
  listCompanies,
  createCompany,
  updateCompany,
  updateCompaniesGroup,
  deleteCompany,
  setCommissionTiers,
  getCommissionTiers,
  listCompanyUsers,
  type CompanyInput,
} from '../../services/companies'
import { listCompanyPackages, deleteCompanyPackages } from '../../services/packages'
import { listCompanyGroups, createCompanyGroup, deleteCompanyGroup } from '../../services/groups'
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
  const [groups, setGroups] = useState<CompanyGroup[]>([])
  const [editing, setEditing] = useState<Company | 'new' | null>(null)
  const [userFor, setUserFor] = useState<Company | null>(null)
  const [deleting, setDeleting] = useState<Company | null>(null)
  const [deletingUser, setDeletingUser] = useState<Profile | null>(null)
  const [deletingGroup, setDeletingGroup] = useState<CompanyGroup | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [grouping, setGrouping] = useState(false)
  const [ungrouping, setUngrouping] = useState(false)

  async function refresh() {
    const [list, groupList] = await Promise.all([listCompanies(), listCompanyGroups()])
    setCompanies(list)
    setGroups(groupList)
    const entries = await Promise.all(
      list.map(async (c) => [c.id, await listCompanyUsers(c.id)] as const),
    )
    setCompanyUsers(Object.fromEntries(entries))
  }

  useEffect(() => {
    refresh()
  }, [])

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  if (!companies) return <PageLoader />

  const selectedCompanies = companies.filter((c) => selected.has(c.id))

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Compagnies</h1>
        <Button onClick={() => setEditing('new')} className="w-full sm:w-auto">
          <Plus className="h-4 w-4" /> Nouvelle compagnie
        </Button>
      </div>

      {groups.length > 0 && (
        <div className="mb-6 overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <p className="border-b border-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-700">
            Groupes
          </p>
          <ul className="divide-y divide-gray-100">
            {groups.map((g) => {
              const count = companies.filter((c) => c.group_id === g.id).length
              return (
                <li key={g.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <span className="font-medium text-gray-900">
                    {g.name}{' '}
                    <span className="font-normal text-gray-400">
                      ({count} compagnie{count > 1 ? 's' : ''})
                    </span>
                  </span>
                  <button
                    onClick={() => setDeletingGroup(g)}
                    className="flex items-center gap-1 text-sm font-medium text-red-600 hover:underline"
                  >
                    <Trash2 className="h-4 w-4" /> Supprimer
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {selected.size > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-brand-100 bg-brand-50 px-4 py-3">
          <span className="text-sm font-medium text-brand-800">
            {selected.size} compagnie{selected.size > 1 ? 's' : ''} sélectionnée{selected.size > 1 ? 's' : ''}
          </span>
          <button
            onClick={() => setGrouping(true)}
            className="flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline"
          >
            <Layers className="h-4 w-4" /> Grouper
          </button>
          <button
            onClick={() => setUngrouping(true)}
            className="flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline"
          >
            <Ungroup className="h-4 w-4" /> Retirer du groupe
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="ml-auto flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-gray-700"
          >
            <X className="h-4 w-4" /> Désélectionner
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  aria-label="Tout sélectionner"
                  checked={companies.length > 0 && selected.size === companies.length}
                  onChange={(e) =>
                    setSelected(e.target.checked ? new Set(companies.map((c) => c.id)) : new Set())
                  }
                  className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                />
              </th>
              <th className="px-4 py-3 font-medium">Nom</th>
              <th className="px-4 py-3 font-medium">Groupe</th>
              <th className="px-4 py-3 font-medium">Commission par colis</th>
              <th className="px-4 py-3 font-medium">Utilisateur(s)</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {companies.map((c) => (
              <tr key={c.id} className={selected.has(c.id) ? 'bg-brand-50/40' : undefined}>
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    aria-label={`Sélectionner ${c.name}`}
                    checked={selected.has(c.id)}
                    onChange={() => toggleSelect(c.id)}
                    className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                  />
                </td>
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
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
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

      {deletingGroup && (
        <DeleteGroupModal
          group={deletingGroup}
          companyCount={companies.filter((c) => c.group_id === deletingGroup.id).length}
          onClose={() => setDeletingGroup(null)}
          onDeleted={async () => {
            setDeletingGroup(null)
            await refresh()
          }}
        />
      )}

      {grouping && (
        <GroupCompaniesModal
          companies={selectedCompanies}
          onClose={() => setGrouping(false)}
          onGrouped={async () => {
            setGrouping(false)
            setSelected(new Set())
            await refresh()
          }}
        />
      )}

      {ungrouping && (
        <UngroupCompaniesModal
          companies={selectedCompanies}
          onClose={() => setUngrouping(false)}
          onUngrouped={async () => {
            setUngrouping(false)
            setSelected(new Set())
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

function DeleteGroupModal({
  group,
  companyCount,
  onClose,
  onDeleted,
}: {
  group: CompanyGroup
  companyCount: number
  onClose: () => void
  onDeleted: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    setLoading(true)
    setError(null)
    try {
      await deleteCompanyGroup(group.id)
      onDeleted()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title="Supprimer le groupe" onClose={onClose}>
      <p className="mb-4 text-gray-600">
        Confirmez-vous la suppression du groupe <strong>{group.name}</strong> ?
        {companyCount > 0 && (
          <>
            {' '}
            Les {companyCount} compagnie{companyCount > 1 ? 's' : ''} qu'il contient ne seront pas
            supprimées, juste détachées du groupe.
          </>
        )}
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

function GroupCompaniesModal({
  companies,
  onClose,
  onGrouped,
}: {
  companies: Company[]
  onClose: () => void
  onGrouped: () => void
}) {
  const [groups, setGroups] = useState<CompanyGroup[]>([])
  const [groupId, setGroupId] = useState('')
  const [newGroupName, setNewGroupName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    listCompanyGroups().then(setGroups)
  }, [])

  async function handleAddGroup() {
    if (!newGroupName.trim()) return
    const created = await createCompanyGroup(newGroupName.trim())
    setGroups((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))
    setGroupId(created.id)
    setNewGroupName('')
  }

  async function handleSubmit() {
    if (!groupId) return
    setLoading(true)
    setError(null)
    try {
      await updateCompaniesGroup(companies.map((c) => c.id), groupId)
      onGrouped()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title="Grouper les compagnies" onClose={onClose}>
      <p className="mb-3 text-sm text-gray-500">
        Ces compagnies partageront le même groupe (utile pour des succursales) :
      </p>
      <ul className="mb-4 space-y-1 text-sm font-medium text-gray-900">
        {companies.map((c) => (
          <li key={c.id}>• {c.name}</li>
        ))}
      </ul>
      <Field label="Groupe">
        <Select value={groupId} onChange={(e) => setGroupId(e.target.value)}>
          <option value="">Sélectionner…</option>
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
      {error && <p className="mb-3 text-sm font-medium text-red-600">{error}</p>}
      <Button onClick={handleSubmit} loading={loading} disabled={!groupId} className="w-full">
        Grouper {companies.length} compagnie{companies.length > 1 ? 's' : ''}
      </Button>
    </Modal>
  )
}

function UngroupCompaniesModal({
  companies,
  onClose,
  onUngrouped,
}: {
  companies: Company[]
  onClose: () => void
  onUngrouped: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    setLoading(true)
    setError(null)
    try {
      await updateCompaniesGroup(companies.map((c) => c.id), null)
      onUngrouped()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title="Retirer du groupe" onClose={onClose}>
      <p className="mb-3 text-sm text-gray-500">
        Ces compagnies ne partageront plus de groupe (les comptes compagnie associés ne verront plus
        les succursales des unes des autres) :
      </p>
      <ul className="mb-4 space-y-1 text-sm font-medium text-gray-900">
        {companies.map((c) => (
          <li key={c.id}>• {c.name}</li>
        ))}
      </ul>
      {error && <p className="mb-3 text-sm font-medium text-red-600">{error}</p>}
      <div className="flex gap-3">
        <Button variant="secondary" className="flex-1" onClick={onClose}>
          Annuler
        </Button>
        <Button variant="danger" className="flex-1" loading={loading} onClick={handleSubmit}>
          Retirer du groupe
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
      <Field label="Mot de passe de confirmation">
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
