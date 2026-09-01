import { useState } from 'react'
import { Download, CheckCircle2 } from 'lucide-react'
import { exportAllData, type BackupResult } from '../../services/backup'
import { Button } from '../../components/ui/Button'

function triggerDownload(content: string, filename: string) {
  const blob = new Blob([content], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export default function AdminBackup() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastExport, setLastExport] = useState<BackupResult | null>(null)

  async function handleExport() {
    setLoading(true)
    setError(null)
    try {
      const result = await exportAllData()
      const dateStr = new Date().toISOString().slice(0, 10)
      triggerDownload(JSON.stringify(result, null, 2), `wintracker-sauvegarde-${dateStr}.json`)
      setLastExport(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  const totalRecords = lastExport
    ? Object.values(lastExport.counts).reduce((sum, n) => sum + n, 0)
    : 0

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Sauvegarde</h1>
        <p className="mt-1 text-sm text-gray-500">
          Téléchargez une copie complète des données de l'application au format JSON.
        </p>
      </div>

      <div className="max-w-2xl rounded-2xl border border-gray-200 bg-white p-6">
        <p className="mb-4 text-sm text-gray-600">
          Le fichier contient toutes les compagnies, groupes, livreurs, agents, colis (avec leur
          historique) et dépenses enregistrés. Les comptes de connexion (emails, mots de passe) ne
          sont pas inclus — en cas de besoin, il faudra recréer les comptes séparément, mais toutes
          les données métier seront préservées.
        </p>
        <p className="mb-6 text-sm text-gray-500">
          Ceci est un export manuel, pas une sauvegarde automatique : pensez à le télécharger
          régulièrement et à conserver le fichier en lieu sûr (email, cloud personnel...).
        </p>

        <Button onClick={handleExport} loading={loading} className="w-full sm:w-auto">
          <Download className="h-5 w-5" /> Télécharger la sauvegarde (JSON)
        </Button>

        {error && <p className="mt-4 text-sm font-medium text-red-600">{error}</p>}

        {lastExport && !error && (
          <div className="mt-4 flex items-start gap-2 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Sauvegarde générée le {new Date(lastExport.generated_at).toLocaleString('fr-FR')} —{' '}
              {totalRecords} enregistrement(s) au total.
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
