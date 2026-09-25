import type { ReactNode } from 'react'
import { PACKAGE_STATUS_COLORS, PACKAGE_STATUS_LABELS, type PackageStatus } from '../../types/database'

export function StatusBadge({
  status,
  className = '',
  children,
}: {
  status: PackageStatus
  className?: string
  /** Contenu ajouté après le libellé (ex: icône indiquant que le badge est cliquable). */
  children?: ReactNode
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${PACKAGE_STATUS_COLORS[status]} ${className}`}
    >
      {PACKAGE_STATUS_LABELS[status]}
      {children}
    </span>
  )
}
