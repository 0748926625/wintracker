import { supabase } from '../lib/supabase'
import type { Driver, DriverStatus } from '../types/database'

export async function getMyDriver(profileId: string): Promise<Driver> {
  const { data, error } = await supabase
    .from('drivers')
    .select('*, profile:profiles(*)')
    .eq('profile_id', profileId)
    .single()
  if (error) throw error
  return data as unknown as Driver
}

export async function listDrivers(): Promise<Driver[]> {
  const { data, error } = await supabase
    .from('drivers')
    .select('*, profile:profiles(*), packages:packages(count)')
    .order('created_at', { ascending: false })
  if (error) throw error

  return (data as unknown as Array<Driver & { packages: { count: number }[] }>).map((d) => ({
    ...d,
    active_packages_count: d.packages?.[0]?.count ?? 0,
  }))
}

export async function updateDriverStatus(id: string, status: DriverStatus): Promise<Driver> {
  const { data, error } = await supabase
    .from('drivers')
    .update({ status })
    .eq('id', id)
    .select('*, profile:profiles(*)')
    .single()
  if (error) throw error
  return data as unknown as Driver
}

export async function updateDriverProfile(
  profileId: string,
  patch: { name?: string; phone?: string },
): Promise<void> {
  const { error } = await supabase.from('profiles').update(patch).eq('id', profileId)
  if (error) throw error
}
