import type { ReactNode } from 'react'
import { X } from 'lucide-react'

export function Modal({
  title,
  onClose,
  children,
  centered = false,
}: {
  title: string
  onClose: () => void
  children: ReactNode
  /** Centre la modale même sur mobile, au lieu du tiroir bas par défaut. */
  centered?: boolean
}) {
  return (
    <div
      className={`fixed inset-0 z-50 flex justify-center bg-black/40 sm:items-center sm:p-4 ${
        centered ? 'items-center p-4' : 'items-end p-0'
      }`}
    >
      <div className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:max-w-lg sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
