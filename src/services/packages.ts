import { supabase } from '../lib/supabase'
import type { Package, PackageEvent, PackageStatus } from '../types/database'
import { getCurrentLocation, type GeoPoint } from '../lib/geolocation'

const PACKAGE_SELECT = `*, company:companies(*), driver:drivers(*, profile:profiles(*)), agent:gare_agents(*)`

export async function listAllPackages(): Promise<Package[]> {
  const { data, error } = await supabase
    .from('packages')
    .select(PACKAGE_SELECT)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as unknown as Package[]
}

export async function listCompanyPackages(companyId: string): Promise<Package[]> {
  const { data, error } = await supabase
    .from('packages')
    .select(PACKAGE_SELECT)
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as unknown as Package[]
}

/** Colis de plusieurs compagnies à la fois (ex: succursales d'un même groupe). */
export async function listCompaniesPackages(companyIds: string[]): Promise<Package[]> {
  const { data, error } = await supabase
    .from('packages')
    .select(PACKAGE_SELECT)
    .in('company_id', companyIds)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as unknown as Package[]
}

export async function listDriverPackages(driverId: string): Promise<Package[]> {
  const { data, error } = await supabase
    .from('packages')
    .select(PACKAGE_SELECT)
    .eq('driver_id', driverId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as unknown as Package[]
}

export async function getPackage(id: string): Promise<Package> {
  const { data, error } = await supabase
    .from('packages')
    .select(PACKAGE_SELECT)
    .eq('id', id)
    .single()
  if (error) throw error
  return data as unknown as Package
}

export async function getPackageEvents(packageId: string): Promise<PackageEvent[]> {
  const { data, error } = await supabase
    .from('package_events')
    .select('*')
    .eq('package_id', packageId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data as PackageEvent[]
}

export interface CreatePackageInput {
  company_id: string
  agent_id?: string
  external_reference?: string
  sender_name?: string
  sender_phone?: string
  recipient_name: string
  recipient_phone: string
  delivery_address: string
  description?: string
  price?: number
}

export async function createPackage(input: CreatePackageInput): Promise<Package> {
  const { data, error } = await supabase.from('packages').insert(input).select(PACKAGE_SELECT).single()
  if (error) throw error
  return data as unknown as Package
}

export async function updatePackage(
  id: string,
  patch: Partial<CreatePackageInput>,
): Promise<Package> {
  const { data, error } = await supabase
    .from('packages')
    .update(patch)
    .eq('id', id)
    .select(PACKAGE_SELECT)
    .single()
  if (error) throw error
  return data as unknown as Package
}

export async function assignDriver(packageId: string, driverId: string | null): Promise<Package> {
  const { data, error } = await supabase
    .from('packages')
    .update({ driver_id: driverId })
    .eq('id', packageId)
    .select(PACKAGE_SELECT)
    .single()
  if (error) throw error
  return data as unknown as Package
}

async function setStatus(
  packageId: string,
  status: PackageStatus,
  location?: GeoPoint | null,
): Promise<Package> {
  if (location) {
    const { error: rpcError } = await supabase.rpc('set_package_status', {
      p_package_id: packageId,
      p_new_status: status,
      p_latitude: location.latitude,
      p_longitude: location.longitude,
    })
    if (rpcError) throw rpcError
    return getPackage(packageId)
  }

  const { data, error } = await supabase
    .from('packages')
    .update({ status })
    .eq('id', packageId)
    .select(PACKAGE_SELECT)
    .single()
  if (error) throw error
  return data as unknown as Package
}

export async function markRecupere(packageId: string, captureLocation = true) {
  const location = captureLocation ? await getCurrentLocation() : null
  return setStatus(packageId, 'RECUPERE', location)
}
export const commencerLivraison = (packageId: string) => setStatus(packageId, 'EN_LIVRAISON')
export const nouvelleTentative = (packageId: string) => setStatus(packageId, 'EN_LIVRAISON')
export const marquerRetour = (packageId: string) => setStatus(packageId, 'RETOUR')

export interface DeliveryConfirmationInput {
  receiver_name: string
  comment?: string
  photo_url?: string
}

export async function confirmDelivery(
  packageId: string,
  input: DeliveryConfirmationInput,
  captureLocation = true,
): Promise<Package> {
  const location = captureLocation ? await getCurrentLocation() : null
  const pkg = await setStatus(packageId, 'LIVRE', location)
  const { error } = await supabase.from('delivery_proofs').insert({
    package_id: packageId,
    receiver_name: input.receiver_name,
    comment: input.comment || null,
    photo_url: input.photo_url || null,
  })
  if (error) throw error
  return pkg
}

export async function declareFailure(packageId: string, reason: string, comment?: string) {
  const pkg = await setStatus(packageId, 'ECHEC')
  const fullComment = comment ? `${reason} — ${comment}` : reason

  const { data: lastEvent, error: fetchError } = await supabase
    .from('package_events')
    .select('id')
    .eq('package_id', packageId)
    .eq('new_status', 'ECHEC')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
  if (fetchError) throw fetchError

  const { error } = await supabase
    .from('package_events')
    .update({ comment: fullComment })
    .eq('id', lastEvent.id)
  if (error) throw error

  return pkg
}

export async function uploadDeliveryPhoto(packageId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop()
  const path = `${packageId}/${Date.now()}.${ext}`
  const { error } = await supabase.storage.from('delivery-proofs').upload(path, file)
  if (error) throw error
  const { data } = supabase.storage.from('delivery-proofs').getPublicUrl(path)
  return data.publicUrl
}
