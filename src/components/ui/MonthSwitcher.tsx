import { ChevronLeft, ChevronRight, History } from 'lucide-react'
import type { MonthFilter } from '../../hooks/useMonthFilter'

export function MonthSwitcher({ mf }: { mf: MonthFilter }) {
  return (
    <div className="flex items-center gap-1 rounded-xl border border-gray-200 bg-white px-1.5 py-1.5">
      <button
        onClick={mf.prev}
        title="Mois précédent"
        className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <span className="min-w-[8.5rem] text-center text-sm font-semibold capitalize text-gray-900">
        {mf.label}
      </span>
      <button
        onClick={mf.next}
        disabled={mf.isCurrent}
        title="Mois suivant"
        className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-30"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
      {!mf.isCurrent && (
        <button
          onClick={mf.reset}
          title="Revenir au mois en cours"
          className="ml-1 flex items-center gap-1 whitespace-nowrap rounded-lg bg-brand-50 px-2 py-1 text-xs font-medium text-brand-600 hover:bg-brand-100"
        >
          <History className="h-3.5 w-3.5" /> Mois en cours
        </button>
      )}
    </div>
  )
}
