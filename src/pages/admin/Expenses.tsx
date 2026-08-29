import { useEffect, useState } from 'react'
import { Plus, Trash2, Square, CheckSquare } from 'lucide-react'
import {
  listExpenses,
  createExpense,
  stopRecurringExpense,
  deleteExpense,
  type CreateExpenseInput,
} from '../../services/expenses'
import { totalExpensesInRange, expenseAmountInRange } from '../../lib/expenses'
import { usePeriodFilter } from '../../hooks/usePeriodFilter'
import { EXPENSE_CATEGORY_LABELS, type Expense, type ExpenseCategory } from '../../types/database'
import { PageLoader } from '../../components/ui/PageLoader'
import { StatCard } from '../../components/ui/StatCard'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { Field, Input, Select } from '../../components/ui/Field'
import { PeriodSwitcher } from '../../components/ui/PeriodSwitcher'

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

export default function AdminExpenses() {
  const [expenses, setExpenses] = useState<Expense[] | null>(null)
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState<Expense | null>(null)
  const [stopping, setStopping] = useState<Expense | null>(null)
  const pf = usePeriodFilter()

  async function refresh() {
    setExpenses(await listExpenses())
  }

  useEffect(() => {
    refresh()
  }, [])

  if (!expenses) return <PageLoader />

  const recurring = expenses.filter((e) => e.is_recurring)
  const oneTime = expenses
    .filter((e) => !e.is_recurring)
    .filter((e) => expenseAmountInRange(e, pf.start, pf.end) > 0)
  const total = totalExpensesInRange(expenses, pf.start, pf.end)

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dépenses</h1>
        <Button onClick={() => setCreating(true)} className="w-full sm:w-auto">
          <Plus className="h-4 w-4" /> Nouvelle dépense
        </Button>
      </div>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <StatCard label="Total dépenses (F)" value={total} accent="text-red-600" />
        <PeriodSwitcher pf={pf} />
      </div>

      <h2 className="mb-3 text-lg font-bold text-gray-900">Charges récurrentes (mensuelles)</h2>
      <div className="mb-8 overflow-x-auto rounded-2xl border border-gray-200 bg-white">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="px-4 py-3 font-medium">Libellé</th>
              <th className="px-4 py-3 font-medium">Catégorie</th>
              <th className="px-4 py-3 font-medium">Montant / mois</th>
              <th className="px-4 py-3 font-medium">Depuis</th>
              <th className="px-4 py-3 font-medium">Statut</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {recurring.map((e) => {
              const stopped = e.recurrence_end != null && e.recurrence_end <= todayIso()
              return (
                <tr key={e.id}>
                  <td className="px-4 py-3 font-medium text-gray-900">{e.label}</td>
                  <td className="px-4 py-3 text-gray-600">{EXPENSE_CATEGORY_LABELS[e.category]}</td>
                  <td className="px-4 py-3 text-gray-600">{e.amount.toLocaleString('fr-FR')} F</td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(e.expense_date).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        stopped ? 'bg-gray-100 text-gray-500' : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {stopped ? `Arrêtée le ${new Date(e.recurrence_end!).toLocaleDateString('fr-FR')}` : 'Active'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-3">
                      {!stopped && (
                        <button
                          onClick={() => setStopping(e)}
                          className="flex items-center gap-1 text-sm font-medium text-amber-600 hover:underline"
                        >
                          <Square className="h-3.5 w-3.5" /> Arrêter
                        </button>
                      )}
                      <button
                        onClick={() => setDeleting(e)}
                        className="flex items-center gap-1 text-sm font-medium text-red-600 hover:underline"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Supprimer
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {recurring.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  Aucune charge récurrente.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <h2 className="mb-3 text-lg font-bold text-gray-900">Dépenses de la période</h2>
      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="px-4 py-3 font-medium">Libellé</th>
              <th className="px-4 py-3 font-medium">Catégorie</th>
              <th className="px-4 py-3 font-medium">Montant</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {oneTime.map((e) => (
              <tr key={e.id}>
                <td className="px-4 py-3 font-medium text-gray-900">{e.label}</td>
                <td className="px-4 py-3 text-gray-600">{EXPENSE_CATEGORY_LABELS[e.category]}</td>
                <td className="px-4 py-3 text-gray-600">{e.amount.toLocaleString('fr-FR')} F</td>
                <td className="px-4 py-3 text-gray-500">
                  {new Date(e.expense_date).toLocaleDateString('fr-FR')}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => setDeleting(e)}
                    className="flex items-center gap-1 text-sm font-medium text-red-600 hover:underline"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Supprimer
                  </button>
                </td>
              </tr>
            ))}
            {oneTime.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  Aucune dépense ponctuelle sur cette période.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {creating && (
        <CreateExpenseModal
          onClose={() => setCreating(false)}
          onSaved={async () => {
            setCreating(false)
            await refresh()
          }}
        />
      )}

      {stopping && (
        <StopRecurringModal
          expense={stopping}
          onClose={() => setStopping(null)}
          onStopped={async () => {
            setStopping(null)
            await refresh()
          }}
        />
      )}

      {deleting && (
        <DeleteExpenseModal
          expense={deleting}
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

const CATEGORIES = Object.keys(EXPENSE_CATEGORY_LABELS) as ExpenseCategory[]

function CreateExpenseModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [isRecurring, setIsRecurring] = useState(false)
  const [category, setCategory] = useState<ExpenseCategory>('AUTRE')
  const [label, setLabel] = useState('')
  const [amount, setAmount] = useState('')
  const [expenseDate, setExpenseDate] = useState(todayIso())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const input: CreateExpenseInput = {
        category,
        label,
        amount: Number(amount),
        is_recurring: isRecurring,
        expense_date: expenseDate,
      }
      await createExpense(input)
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title="Nouvelle dépense" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <label className="mb-4 flex cursor-pointer items-start gap-2 rounded-xl border border-gray-200 p-3 hover:bg-gray-50">
          <button
            type="button"
            onClick={() => setIsRecurring((v) => !v)}
            className="mt-0.5 text-brand-600"
          >
            {isRecurring ? <CheckSquare className="h-5 w-5" /> : <Square className="h-5 w-5" />}
          </button>
          <span className="text-sm">
            <span className="block font-medium text-gray-900">Charge récurrente (mensuelle)</span>
            <span className="block text-gray-500">
              Comptée automatiquement chaque mois à partir de la date choisie, jusqu'à ce qu'elle soit
              arrêtée.
            </span>
          </span>
        </label>

        <Field label="Catégorie">
          <Select value={category} onChange={(e) => setCategory(e.target.value as ExpenseCategory)}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {EXPENSE_CATEGORY_LABELS[c]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Libellé / bénéficiaire">
          <Input
            required
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Ex: Koffi Yao, réparation moto..."
          />
        </Field>
        <Field label="Montant (F)">
          <Input
            type="number"
            required
            min={1}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </Field>
        <Field label={isRecurring ? 'Date de la première charge' : 'Date de la dépense'}>
          <Input
            type="date"
            required
            value={expenseDate}
            onChange={(e) => setExpenseDate(e.target.value)}
          />
        </Field>
        {error && <p className="mb-3 text-sm font-medium text-red-600">{error}</p>}
        <Button type="submit" loading={loading} className="w-full">
          Ajouter la dépense
        </Button>
      </form>
    </Modal>
  )
}

function StopRecurringModal({
  expense,
  onClose,
  onStopped,
}: {
  expense: Expense
  onClose: () => void
  onStopped: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleStop() {
    setLoading(true)
    setError(null)
    try {
      await stopRecurringExpense(expense.id)
      onStopped()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title="Arrêter la charge récurrente" onClose={onClose}>
      <p className="mb-4 text-gray-600">
        <strong>{expense.label}</strong> ne sera plus comptée à partir d'aujourd'hui. Les mois déjà
        passés restent inchangés dans l'historique.
      </p>
      {error && <p className="mb-3 text-sm font-medium text-red-600">{error}</p>}
      <div className="flex gap-3">
        <Button variant="secondary" className="flex-1" onClick={onClose}>
          Annuler
        </Button>
        <Button variant="danger" className="flex-1" loading={loading} onClick={handleStop}>
          Arrêter
        </Button>
      </div>
    </Modal>
  )
}

function DeleteExpenseModal({
  expense,
  onClose,
  onDeleted,
}: {
  expense: Expense
  onClose: () => void
  onDeleted: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    setLoading(true)
    setError(null)
    try {
      await deleteExpense(expense.id)
      onDeleted()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title="Supprimer la dépense" onClose={onClose}>
      <p className="mb-4 text-gray-600">
        Confirmez-vous la suppression définitive de <strong>{expense.label}</strong> ?
        {expense.is_recurring &&
          ' Toutes les échéances passées de cette charge récurrente seront retirées de l\'historique.'}
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
