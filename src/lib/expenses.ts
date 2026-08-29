import type { Expense } from '../types/database'

function parseDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/**
 * Montant d'une dépense effectivement imputable à la période [start, end].
 * Pour une dépense ponctuelle : le montant si sa date tombe dans la période, sinon 0.
 * Pour une charge récurrente : le montant multiplié par le nombre d'échéances
 * (mensuelles ou hebdomadaires selon recurrence_frequency, ancrées sur
 * expense_date, bornées à recurrence_end si défini) qui tombent dans la
 * période. Un mois peut ainsi compter 4 ou 5 échéances hebdomadaires selon
 * la façon dont les semaines tombent — c'est le reflet exact des sorties
 * d'argent réelles, pas une moyenne lissée.
 */
export function expenseAmountInRange(expense: Expense, start: Date, end: Date): number {
  const anchor = parseDate(expense.expense_date)

  if (!expense.is_recurring) {
    return anchor >= start && anchor <= end ? expense.amount : 0
  }

  const recurrenceEnd = expense.recurrence_end ? parseDate(expense.recurrence_end) : null
  const rangeEnd = recurrenceEnd && recurrenceEnd < end ? recurrenceEnd : end
  if (rangeEnd < start || rangeEnd < anchor) return 0

  let occurrences = 0

  if (expense.recurrence_frequency === 'WEEKLY') {
    const cursor = new Date(anchor)
    while (cursor <= rangeEnd) {
      if (cursor >= start) occurrences++
      cursor.setDate(cursor.getDate() + 7)
    }
  } else {
    const day = anchor.getDate()
    const cursor = new Date(anchor.getFullYear(), anchor.getMonth(), 1)
    while (cursor <= rangeEnd) {
      const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate()
      const occurrence = new Date(cursor.getFullYear(), cursor.getMonth(), Math.min(day, daysInMonth))
      if (occurrence >= anchor && occurrence >= start && occurrence <= rangeEnd) {
        occurrences++
      }
      cursor.setMonth(cursor.getMonth() + 1)
    }
  }

  return occurrences * expense.amount
}

export function totalExpensesInRange(expenses: Expense[], start: Date, end: Date): number {
  return expenses.reduce((sum, e) => sum + expenseAmountInRange(e, start, end), 0)
}
