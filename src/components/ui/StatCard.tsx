import type { LucideIcon } from 'lucide-react'

export function StatCard({
  label,
  value,
  icon: Icon,
  accent = 'text-gray-900',
}: {
  label: string
  value: number
  icon?: LucideIcon
  accent?: string
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-500">{label}</span>
        {Icon && <Icon className="h-5 w-5 text-gray-400" />}
      </div>
      <div className={`mt-2 text-3xl font-bold ${accent}`}>{value}</div>
    </div>
  )
}
