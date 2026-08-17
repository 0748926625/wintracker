import { useEffect, useState } from 'react'
import { useAuth } from './useAuth'
import { getMyDriver } from '../services/drivers'
import type { Driver } from '../types/database'

export function useMyDriver() {
  const { profile } = useAuth()
  const [driver, setDriver] = useState<Driver | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) return
    getMyDriver(profile.id)
      .then(setDriver)
      .finally(() => setLoading(false))
  }, [profile])

  return { driver, loading }
}
