export const ROLES = {
  PROMOTER:   'promoter'   as const,
  BUSINESS:   'business'   as const,
  ADMIN:      'admin'      as const,
  SUPERVISOR: 'supervisor' as const,
}

export type Role = 'promoter' | 'business' | 'admin' | 'supervisor'