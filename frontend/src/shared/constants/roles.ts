export const ROLES = {
  PROMOTER: 'promoter' as const,
  BUSINESS: 'business' as const,
  ADMIN:    'admin'    as const,
}

export type Role = 'promoter' | 'business' | 'admin'