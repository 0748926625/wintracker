import type { Expense } from '../types/database'

function parseDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/**
 * Montant d'une dépense effectivement imputable à la période [start, end].
 * Pour une dépense ponctuelle : le montant si sa date tombe dans la période, sinon 0.
 * Pour une charge récurrente : le montant multiplié par le nombre d'échéances
 * mensuelles (même jour du mois que expense_date, borné à recurrence_end si
 * défini) qui tombent dans la période.
 */
export function expenseAmountInRange(expense: Expense, start: Date, end: Date): number {
  const anchor = parseDate(expense.expense_date)

  if (!expense.is_recurring) {
    return anchor >= start && anchor <= end ? expense.amount : 0
  }

  const recurrenceEnd = expense.recurrence_end ? parseDate(expense.recurrence_end) : null
  const rangeEnd = recurrenceEnd && recurrenceEnd < end ? recurrenceEnd : end
  if (rangeEnd < start || rangeEnd < anchor) return 0

  const day = anchor.getDate()
  let occurrences = 0
  const cursor = new Date(anchor.getFullYear(), anchor.getMonth(), 1)

  while (cursor <= rangeEnd) {
    const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate()
    const occurrence = new Date(cursor.getFullYear(), cursor.getMonth(), Math.min(day, daysInMonth))
    if (occurrence >= anchor && occurrence >= start && occurrence <= rangeEnd) {
      occurrences++
    }
    cursor.setMonth(cursor.getMonth() + 1)
  }

  return occurrences * expense.amount
}

export function totalExpensesInRange(expenses: Expense[], start: Date, end: Date): number {
  return expenses.reduce((sum, e) => sum + expenseAmountInRange(e, start, end), 0)
}
