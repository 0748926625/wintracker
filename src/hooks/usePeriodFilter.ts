import { useMemo, useState } from 'react'

export type PeriodMode = 'day' | 'week' | 'month' | 'custom'

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function dateKey(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function monthKey(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
}

/** Lundi de la semaine contenant d. */
function startOfWeek(d: Date) {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  date.setDate(date.getDate() + diff)
  return date
}

function formatDay(d: Date) {
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

function formatShort(d: Date) {
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

/**
 * Filtre de période (jour / semaine / mois / période libre), période courante par
 * défaut, historique en naviguant en arrière. Utilisé pour scoper Dashboard/Colis/
 * Finances sur une période donnée.
 */
export function usePeriodFilter() {
  const now = new Date()
  const [mode, setMode] = useState<PeriodMode>('month')

  const [dayAnchor, setDayAnchor] = useState(dateKey(now))
  const [weekAnchor, setWeekAnchor] = useState(dateKey(startOfWeek(now)))
  const [monthAnchor, setMonthAnchor] = useState(monthKey(now))
  const [customRange, setCustomRangeState] = useState(() => {
    const key = dateKey(now)
    return { start: key, end: key }
  })

  const { start, end, label, isCurrent } = useMemo(() => {
    if (mode === 'day') {
      const [y, m, d] = dayAnchor.split('-').map(Number)
      const start = new Date(y, m - 1, d, 0, 0, 0)
      const end = new Date(y, m - 1, d, 23, 59, 59)
      return { start, end, label: formatDay(start), isCurrent: dayAnchor === dateKey(now) }
    }
    if (mode === 'week') {
      const [y, m, d] = weekAnchor.split('-').map(Number)
      const start = new Date(y, m - 1, d, 0, 0, 0)
      const end = new Date(y, m - 1, d + 6, 23, 59, 59)
      const label = `${formatShort(start)} – ${formatShort(end)}`
      return { start, end, label, isCurrent: weekAnchor === dateKey(startOfWeek(now)) }
    }
    if (mode === 'custom') {
      const [sy, sm, sd] = customRange.start.split('-').map(Number)
      const [ey, em, ed] = customRange.end.split('-').map(Number)
      let start = new Date(sy, sm - 1, sd, 0, 0, 0)
      let end = new Date(ey, em - 1, ed, 23, 59, 59)
      if (start > end) [start, end] = [end, start]
      const label =
        customRange.start === customRange.end
          ? formatDay(start)
          : `${formatShort(start)} – ${formatShort(end)}`
      return { start, end, label, isCurrent: false }
    }
    const [y, m] = monthAnchor.split('-').map(Number)
    const start = new Date(y, m - 1, 1, 0, 0, 0)
    const end = new Date(y, m, 0, 23, 59, 59)
    const label = start.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    return { start, end, label, isCurrent: monthAnchor === monthKey(now) }
  }, [mode, dayAnchor, weekAnchor, monthAnchor, customRange])

  function shift(delta: number) {
    if (mode === 'day') {
      const [y, m, d] = dayAnchor.split('-').map(Number)
      setDayAnchor(dateKey(new Date(y, m - 1, d + delta)))
    } else if (mode === 'week') {
      const [y, m, d] = weekAnchor.split('-').map(Number)
      setWeekAnchor(dateKey(new Date(y, m - 1, d + delta * 7)))
    } else if (mode === 'month') {
      const [y, m] = monthAnchor.split('-').map(Number)
      setMonthAnchor(monthKey(new Date(y, m - 1 + delta, 1)))
    }
  }

  function inRange(iso: string) {
    const d = new Date(iso)
    return d >= start && d <= end
  }

  function reset() {
    if (mode === 'day') setDayAnchor(dateKey(new Date()))
    else if (mode === 'week') setWeekAnchor(dateKey(startOfWeek(new Date())))
    else if (mode === 'month') setMonthAnchor(monthKey(new Date()))
    else setMode('month')
  }

  function setCustomRange(startDate: string, endDate: string) {
    setCustomRangeState({ start: startDate, end: endDate })
    setMode('custom')
  }

  return {
    mode,
    setMode,
    label,
    isCurrent,
    inRange,
    prev: () => shift(-1),
    next: () => !isCurrent && shift(1),
    reset,
    custom: customRange,
    setCustomRange,
  }
}

export type PeriodFilter = ReturnType<typeof usePeriodFilter>
