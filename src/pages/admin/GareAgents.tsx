import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { listGareAgents, deleteGareAgent } from '../../services/gareAgents'
import type { GareAgent } from '../../types/database'
import { PageLoader } from '../../components/ui/PageLoader'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'

export default function AdminGareAgents() {
  const [agents, setAgents] = useState<GareAgent[] | null>(null)
  const [deleting, setDeleting] = useState<GareAgent | null>(null)

  async function refresh() {
    setAgents(await listGareAgents())
  }

  useEffect(() => {
    refresh()
  }, [])

  if (!agents) return <PageLoader />

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-gray-900">Agents de gare</h1>
      <p className="mb-6 text-sm text-gray-500">
        Carnet des agents en gare proposés dans le formulaire "Nouveau colis" (champ "Agent de la
        gare"). Ce ne sont pas des comptes de connexion — supprimer un agent ne supprime pas les
        colis déjà créés en son nom, il n'apparaît juste plus dans le formulaire.
      </p>

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
            {agents.map((a) => (
              <tr key={a.id}>
                <td className="px-4 py-3 font-medium text-gray-900">{a.name}</td>
                <td className="px-4 py-3 text-gray-600">{a.phone || '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end">
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
                <td colSpan={3} className="px-4 py-8 text-center text-gray-400">
                  Aucun agent de gare pour le moment.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {deleting && (
        <DeleteGareAgentModal
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

function DeleteGareAgentModal({
  agent,
  onClose,
  onDeleted,
}: {
  agent: GareAgent
  onClose: () => void
  onDeleted: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    setLoading(true)
    setError(null)
    try {
      await deleteGareAgent(agent.id)
      onDeleted()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title="Supprimer l'agent de gare" onClose={onClose}>
      <p className="mb-4 text-gray-600">
        Confirmez-vous la suppression de <strong>{agent.name}</strong> du carnet des agents de
        gare ? Il ne sera plus proposé lors de la création d'un colis.
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
