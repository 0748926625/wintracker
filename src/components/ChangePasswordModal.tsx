import { useState, type FormEvent } from 'react'
import { changePassword } from '../services/account'
import { Modal } from './ui/Modal'
import { Field, Input } from './ui/Field'
import { Button } from './ui/Button'

export function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (newPassword !== confirmPassword) {
      setError('Les deux mots de passe ne correspondent pas.')
      return
    }

    setLoading(true)
    try {
      await changePassword(currentPassword, newPassword)
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <Modal title="Mot de passe modifié" onClose={onClose}>
        <p className="mb-4 text-gray-600">Votre mot de passe a bien été mis à jour.</p>
        <Button className="w-full" onClick={onClose}>
          Fermer
        </Button>
      </Modal>
    )
  }

  return (
    <Modal title="Changer le mot de passe" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <Field label="Mot de passe actuel">
          <Input
            type="password"
            required
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
        </Field>
        <Field label="Nouveau mot de passe">
          <Input
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </Field>
        <Field label="Confirmer le nouveau mot de passe">
          <Input
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </Field>

        {error && <p className="mb-3 text-sm font-medium text-red-600">{error}</p>}
        <Button type="submit" loading={loading} className="w-full">
          Mettre à jour
        </Button>
      </form>
    </Modal>
  )
}
