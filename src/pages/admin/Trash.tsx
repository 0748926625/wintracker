import { useCallback, useState } from 'react'
import { Trash2, RotateCcw } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useGare } from '../../hooks/useGare'
import { useRealtimePackages } from '../../hooks/useRealtimePackages'
import {
  listDeletedPackages,
  listCompanyDeletedPackages,
  restorePackage,
  purgePackage,
} from '../../services/packages'
import type { Package } from '../../types/database'
import { PageLoader } from '../../components/ui/PageLoader'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'

export default function AdminTrash() {
  const { profile } = useAuth()
  const { activeCompanyId } = useGare()
  const isSuperAdmin = profile?.role === 'SUPER_ADMIN'
  const canAccess = isSuperAdmin || profile?.can_delete_packages === true

  const fetcher = useCallback(
    () => (activeCompanyId ? listCompanyDeletedPackages(activeCompanyId) : listDeletedPackages()),
    [activeCompanyId],
  )
  const { packages, loading } = useRealtimePackages(
    fetcher,
    activeCompanyId ? 'company_id' : 'all',
    activeCompanyId ?? 'all',
    'trash',
  )

  const [restoringId, setRestoringId] = useState<string | null>(null)
  const [purging, setPurging] = useState<Package | null>(null)

  if (!canAccess) {
    return (
      <p className="text-sm text-gray-500">
        Vous n'avez pas la permission d'accéder à la corbeille.
      </p>
    )
  }

  if (loading) return <PageLoader />

  async function handleRestore(id: string) {
    setRestoringId(id)
    try {
      await restorePackage(id)
    } finally {
      setRestoringId(null)
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Corbeille</h1>
        <p className="mt-1 text-sm text-gray-500">
          Colis supprimés, récupérables à tout moment tant qu'ils ne sont pas purgés
          définitivement.
        </p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="px-4 py-3 font-medium">Code colis</th>
              <th className="px-4 py-3 font-medium">Compagnie</th>
              <th className="px-4 py-3 font-medium">Destinataire</th>
              <th className="px-4 py-3 font-medium">Statut</th>
              <th className="px-4 py-3 font-medium">Supprimé le</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {packages.map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-3 font-medium text-gray-900">
                  {p.external_reference || p.tracking_number}
                </td>
                <td className="px-4 py-3 text-gray-600">{p.company?.name}</td>
                <td className="px-4 py-3 text-gray-900">{p.recipient_name}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={p.status} />
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {p.deleted_at ? new Date(p.deleted_at).toLocaleDateString('fr-FR') : '—'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => handleRestore(p.id)}
                      disabled={restoringId === p.id}
                      className="flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline"
                    >
                      <RotateCcw className="h-4 w-4" /> Restaurer
                    </button>
                    {isSuperAdmin && (
                      <button
                        onClick={() => setPurging(p)}
                        className="flex items-center gap-1 text-sm font-medium text-red-600 hover:underline"
                      >
                        <Trash2 className="h-4 w-4" /> Supprimer définitivement
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {packages.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  La corbeille est vide.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {purging && <PurgeModal pkg={purging} onClose={() => setPurging(null)} />}
    </div>
  )
}

function PurgeModal({ pkg, onClose }: { pkg: Package; onClose: () => void }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handlePurge() {
    setLoading(true)
    setError(null)
    try {
      await purgePackage(pkg.id)
      onClose()
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
