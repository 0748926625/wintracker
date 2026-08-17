import { useMemo, useState } from 'react'

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/**
 * Filtre "mois en cours par défaut, historique en naviguant en arrière".
 * Utilisé pour scoper Dashboard/Colis/Finances sur un mois donné.
 */
export function useMonthFilter() {
  const currentKey = monthKey(new Date())
  const [month, setMonth] = useState(currentKey)

  const { start, end, label, isCurrent } = useMemo(() => {
    const [y, m] = month.split('-').map(Number)
    const start = new Date(y, m - 1, 1, 0, 0, 0)
    const end = new Date(y, m, 0, 23, 59, 59)
    const label = start.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    return { start, end, label, isCurrent: month === currentKey }
  }, [month, currentKey])

  function shift(delta: number) {
    const [y, m] = month.split('-').map(Number)
    setMonth(monthKey(new Date(y, m - 1 + delta, 1)))
  }

  function inRange(iso: string) {
    const d = new Date(iso)
    return d >= start && d <= end
  }

  return {
    month,
    label,
    isCurrent,
    inRange,
    prev: () => shift(-1),
    next: () => !isCurrent && shift(1),
    reset: () => setMonth(currentKey),
  }
}

export type MonthFilter = ReturnType<typeof useMonthFilter>
