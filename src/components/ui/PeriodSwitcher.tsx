import { ChevronLeft, ChevronRight, History } from 'lucide-react'
import type { PeriodFilter, PeriodMode } from '../../hooks/usePeriodFilter'

const MODES: { key: PeriodMode; label: string }[] = [
  { key: 'day', label: 'Jour' },
  { key: 'week', label: 'Semaine' },
  { key: 'month', label: 'Mois' },
  { key: 'custom', label: 'Période' },
]

export function PeriodSwitcher({ pf }: { pf: PeriodFilter }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <div className="flex items-center gap-0.5 rounded-xl border border-gray-200 bg-white p-1">
        {MODES.map((m) => (
          <button
            key={m.key}
            onClick={() => pf.setMode(m.key)}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
              pf.mode === m.key
                ? 'bg-brand-600 text-white'
                : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {pf.mode === 'custom' ? (
        <div className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-2 py-1.5">
          <input
            type="date"
            value={pf.custom.start}
            onChange={(e) => pf.setCustomRange(e.target.value, pf.custom.end)}
            className="rounded-lg border border-gray-200 px-1.5 py-1 text-xs text-gray-700"
          />
          <span className="text-xs text-gray-400">au</span>
          <input
            type="date"
            value={pf.custom.end}
            onChange={(e) => pf.setCustomRange(pf.custom.start, e.target.value)}
            className="rounded-lg border border-gray-200 px-1.5 py-1 text-xs text-gray-700"
          />
        </div>
      ) : (
        <div className="flex items-center gap-1 rounded-xl border border-gray-200 bg-white px-1.5 py-1.5">
          <button
            onClick={pf.prev}
            title="Période précédente"
            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[8.5rem] text-center text-sm font-semibold capitalize text-gray-900">
            {pf.label}
          </span>
          <button
            onClick={pf.next}
            disabled={pf.isCurrent}
            title="Période suivante"
            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          {!pf.isCurrent && (
            <button
              onClick={pf.reset}
              title="Revenir à la période en cours"
              className="ml-1 flex items-center gap-1 whitespace-nowrap rounded-lg bg-brand-50 px-2 py-1 text-xs font-medium text-brand-600 hover:bg-brand-100"
            >
              <History className="h-3.5 w-3.5" /> Actuel
            </button>
          )}
        </div>
      )}
    </div>
  )
}
