import { useEffect, useRef, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { getPackage, getPackageEvents } from '../services/packages'
import type { Package, PackageEvent } from '../types/database'

export function useRealtimePackage(packageId: string | undefined) {
  const [pkg, setPkg] = useState<Package | null>(null)
  const [events, setEvents] = useState<PackageEvent[]>([])
  const [loading, setLoading] = useState(true)
  const channelRef = useRef<RealtimeChannel | null>(null)

  async function refresh() {
    if (!packageId) return
    const [freshPkg, freshEvents] = await Promise.all([
      getPackage(packageId),
      getPackageEvents(packageId),
    ])
    setPkg(freshPkg)
    setEvents(freshEvents)
  }

  useEffect(() => {
    if (!packageId) return
    let cancelled = false
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined

    setLoading(true)
    refresh().finally(() => {
      if (!cancelled) setLoading(false)
    })

    function subscribe() {
      const channel = supabase
        .channel(`package-detail-${packageId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'packages', filter: `id=eq.${packageId}` },
          () => refresh(),
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'package_events',
            filter: `package_id=eq.${packageId}`,
          },
          () => refresh(),
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packageId])

  return { pkg, events, loading, refresh }
}
