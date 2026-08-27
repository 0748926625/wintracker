import { useCallback, useEffect, useRef, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { getPackage } from '../services/packages'
import type { Package } from '../types/database'

type FilterColumn = 'company_id' | 'driver_id' | 'all'
/** 'active' exclut les colis à la corbeille, 'trash' n'affiche que ceux-ci. */
type Mode = 'active' | 'trash'

/**
 * Charge la liste des colis puis reste synchronisé en temps réel via Supabase Realtime.
 * Se réabonne automatiquement en cas de coupure et se désabonne au démontage.
 */
export function useRealtimePackages(
  fetcher: () => Promise<Package[]>,
  filterColumn: FilterColumn,
  filterValue: string | null | undefined,
  mode: Mode = 'active',
) {
  const [packages, setPackages] = useState<Package[]>([])
  const [loading, setLoading] = useState(true)
  const channelRef = useRef<RealtimeChannel | null>(null)

  const applyChange = useCallback(
    async (payload: { eventType: string; new: { id?: string }; old: { id?: string } }) => {
      if (payload.eventType === 'DELETE') {
        const oldId = payload.old.id
        setPackages((prev) => prev.filter((p) => p.id !== oldId))
        return
      }

      const id = payload.new.id
      if (!id) return
      try {
        const fresh = await getPackage(id)
        const belongs = mode === 'trash' ? fresh.deleted_at != null : fresh.deleted_at == null
        setPackages((prev) => {
          if (!belongs) return prev.filter((p) => p.id !== id)
          const exists = prev.some((p) => p.id === id)
          if (exists) return prev.map((p) => (p.id === id ? fresh : p))
          return [fresh, ...prev]
        })
      } catch {
        // le colis n'est plus visible pour cet utilisateur (ex: réaffecté)
        setPackages((prev) => prev.filter((p) => p.id !== id))
      }
    },
    [mode],
  )

  useEffect(() => {
    if (filterColumn !== 'all' && !filterValue) {
      setPackages([])
      setLoading(false)
      return
    }

    let cancelled = false
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined

    setLoading(true)
    fetcher()
      .then((data) => {
        if (!cancelled) setPackages(data)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    function subscribe() {
      const channel = supabase
        .channel(`packages-${filterColumn}-${filterValue ?? 'all'}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'packages',
            ...(filterColumn === 'all' ? {} : { filter: `${filterColumn}=eq.${filterValue}` }),
          },
          (payload) => applyChange(payload as never),
        )
        .subscribe((status) => {
          if ((status === 'CLOSED' || status === 'CHANNEL_ERROR') && !cancelled) {
            reconnectTimer = setTimeout(() => {
              channel.unsubscribe()
              subscribe()
            }, 3000)
          }
        })

      channelRef.current = channel
    }

    subscribe()

    return () => {
      cancelled = true
      if (reconnectTimer) clearTimeout(reconnectTimer)
      channelRef.current?.unsubscribe()
      channelRef.current = null
    }
  }, [fetcher, filterColumn, filterValue, applyChange])

  return { packages, loading, setPackages }
}
