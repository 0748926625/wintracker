export type UserRole = 'SUPER_ADMIN' | 'COMPANY_USER' | 'DRIVER' | 'AGENT'
export type DriverStatus = 'ACTIVE' | 'INACTIVE'
export type PackageStatus =
  | 'EN_ATTENTE'
  | 'RECUPERE'
  | 'EN_LIVRAISON'
  | 'LIVRE'
  | 'ECHEC'
  | 'RETOUR'
export type CommissionType = 'RATE' | 'FIXED_PER_TIER'
export type ExpenseCategory = 'SALAIRE_AGENT' | 'SALAIRE_LIVREUR' | 'CARBURANT' | 'REPARATION' | 'AUTRE'
export type ExpenseRecurrence = 'MONTHLY' | 'WEEKLY'

export interface CompanyGroup {
  id: string
  name: string
  created_at: string
}

export interface CompanyCommissionTier {
  company_id: string
  price: number
  amount: number
}

export interface GareAgent {
  id: string
  name: string
  phone: string | null
  created_at: string
}

export interface Company {
  id: string
  name: string
  phone: string | null
  email: string | null
  address: string | null
  commune: string | null
  group_id: string | null
  commission_type: CommissionType | null
  commission_rate: number | null
  created_at: string
  group?: CompanyGroup
  commission_tiers?: CompanyCommissionTier[]
}

export interface Profile {
  id: string
  user_id: string
  company_id: string | null
  role: UserRole
  name: string
  phone: string | null
  can_delete_packages: boolean
  created_at: string
}

export interface Driver {
  id: string
  profile_id: string
  status: DriverStatus
  created_at: string
  profile?: Profile
}

export interface Package {
  id: string
  tracking_number: string
  external_reference: string | null
  company_id: string
  driver_id: string | null
  agent_id: string | null
  created_by: string | null

  sender_name: string | null
  sender_phone: string | null

  recipient_name: string
  recipient_phone: string

  delivery_address: string
  description: string | null

  status: PackageStatus
  price: number | null

  created_at: string
  updated_at: string
  delivered_at: string | null
  deleted_at: string | null
  count_date: string | null

  company?: Company
  driver?: Driver
  agent?: GareAgent
  creator?: Profile
}

export interface Expense {
  id: string
  category: ExpenseCategory
  label: string
  amount: number
  is_recurring: boolean
  recurrence_frequency: ExpenseRecurrence | null
  expense_date: string
  recurrence_end: string | null
  created_by: string | null
  created_at: string
}

export interface PackageEvent {
  id: string
  package_id: string
  old_status: PackageStatus | null
  new_status: PackageStatus
  changed_by: string | null
  comment: string | null
  latitude: number | null
  longitude: number | null
  created_at: string
}

/** Événement de traitement d'un colis par un agent, avec le colis concerné. */
export interface AgentPackageEvent {
  id: string
  new_status: PackageStatus
  created_at: string
  package: Package
}

export interface DeliveryProof {
  id: string
  package_id: string
  receiver_name: string
  photo_url: string | null
  comment: string | null
  created_at: string
}

export const PACKAGE_STATUS_LABELS: Record<PackageStatus, string> = {
  EN_ATTENTE: 'En attente',
  RECUPERE: 'Récupéré',
  EN_LIVRAISON: 'En livraison',
  LIVRE: 'Livré',
  ECHEC: 'Échec',
  RETOUR: 'Retour',
}

export const PACKAGE_STATUS_COLORS: Record<PackageStatus, string> = {
  EN_ATTENTE: 'bg-gray-100 text-gray-700',
  RECUPERE: 'bg-blue-100 text-blue-700',
  EN_LIVRAISON: 'bg-amber-100 text-amber-700',
  LIVRE: 'bg-green-100 text-green-700',
  ECHEC: 'bg-red-100 text-red-700',
  RETOUR: 'bg-purple-100 text-purple-700',
}

export const PRICE_OPTIONS = [1000, 1500, 2000, 2500, 3000] as const

export const ABIDJAN_COMMUNES = [
  'Abobo',
  'Adjamé',
  'Anyama',
  'Attécoubé',
  'Bingerville',
  'Cocody',
  'Koumassi',
  'Marcory',
  'Plateau',
  'Port-Bouët',
  'Songon',
  'Treichville',
  'Yopougon',
] as const

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  SALAIRE_AGENT: 'Salaire agent Wintrack',
  SALAIRE_LIVREUR: 'Salaire livreur',
  CARBURANT: 'Carburant',
  REPARATION: 'Réparation',
  AUTRE: 'Autre',
}

export const EXPENSE_RECURRENCE_LABELS: Record<ExpenseRecurrence, string> = {
  MONTHLY: 'Mensuelle',
  WEEKLY: 'Hebdomadaire',
}

export const COMMISSION_TYPE_LABELS: Record<CommissionType, string> = {
  RATE: 'Taux (%) par livraison',
  FIXED_PER_TIER: 'Montant fixe par palier de tarif',
}

export const FAILURE_REASONS = [
  'Destinataire absent',
  'Téléphone inaccessible',
  'Mauvaise adresse',
  'Refus du colis',
  'Autre',
] as const
