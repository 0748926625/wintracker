import { PACKAGE_STATUS_COLORS, PACKAGE_STATUS_LABELS, type PackageStatus } from '../../types/database'

export function StatusBadge({ status, className = '' }: { status: PackageStatus; className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${PACKAGE_STATUS_COLORS[status]} ${className}`}
    >
      {PACKAGE_STATUS_LABELS[status]}
    </span>
  )
}
