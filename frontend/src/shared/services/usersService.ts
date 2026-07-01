// src/shared/services/usersService.ts
// API shim — same export signature as the original localStorage version.
// Components call usersService.getProfile(user.id) etc. unchanged.
// Returns data in the exact UserProfile shape components already use.

import { apiFetch, apiUpload } from './api'
import type { UserProfile } from '../types/user.types'

const delay = (ms: number) => new Promise(r => setTimeout(r, ms))

// ── Shape adapter: API flat response → UserProfile nested shape ───────────────
function apiToProfile(u: any): UserProfile {
  const now = new Date().toISOString()
  return {
    userId:      u.id   || u.userId  || '',
    fullName:    u.fullName || u.name || '',
    idNumber:    u.idNumber  || '',
    dateOfBirth: u.dateOfBirth || '',
    gender:      u.gender || 'female',
    address:     u.address || '',
    city:        u.city    || '',
    province:    u.province || '',
    profilePhoto: u.profilePhotoUrl || u.profilePhoto || undefined,

    physicalAttributes: {
      height:       u.height       || 0,
      clothingSize: u.clothingSize || '',
      shoeSize:     u.shoeSize     || '',
    },

    socialMedia: {
      instagram: u.instagram || '',
      tiktok:    u.tiktok    || '',
    },

    documents: {
      idFront:       u.idFrontUrl  || u.idFront  || undefined,
      idBack:        u.idBackUrl   || u.idBack   || undefined,
      profilePhotos: u.profilePhotoUrl ? [u.profilePhotoUrl] : [],
      cv:            u.cvUrl || undefined,
    },

    bankDetails: (u.bankName || u.bankDetails?.bankName) ? {
      bankName:      u.bankName      || u.bankDetails?.bankName      || '',
      accountNumber: u.accountNumber || u.bankDetails?.accountNumber || '',
      accountType:   u.accountType   || u.bankDetails?.accountType   || 'Cheque',
      branchCode:    u.branchCode    || u.bankDetails?.branchCode    || '',
    } : undefined,

    reliabilityScore: u.reliabilityScore || 0,
    onboardingStatus: (u.onboardingStatus || u.status || 'pending_review') as UserProfile['onboardingStatus'],
    rejectionReason:  u.rejectionReason || undefined,
    createdAt: u.createdAt || now,
    updatedAt: u.updatedAt || now,
  }
}

export const usersService = {

  async getProfile(_userIdOrEmail: string): Promise<UserProfile | null> {
    await delay(100)
    try {
      const u = await apiFetch<any>('/users/me/profile')
      return apiToProfile(u)
    } catch {
      return null
    }
  },

  async updateProfile(_userIdOrEmail: string, data: Partial<UserProfile>): Promise<UserProfile> {
    await delay(300)
    // Flatten nested objects to match backend schema
    const flat: Record<string, any> = {
      city:         data.city,
      province:     data.province,
      address:      data.address,
      gender:       data.gender,
      height:       data.physicalAttributes?.height,
      clothingSize: data.physicalAttributes?.clothingSize,
      shoeSize:     data.physicalAttributes?.shoeSize,
      bankName:      data.bankDetails?.bankName,
      accountNumber: data.bankDetails?.accountNumber,
      accountType:   data.bankDetails?.accountType,
      branchCode:    data.bankDetails?.branchCode,
    }
    // Remove undefined keys
    Object.keys(flat).forEach(k => flat[k] === undefined && delete flat[k])

    const u = await apiFetch<any>('/users/me/profile', {
      method: 'PUT',
      body: JSON.stringify(flat),
    })
    return apiToProfile(u)
  },

  async submitOnboarding(_userIdOrEmail: string, data: Partial<UserProfile>): Promise<UserProfile> {
    return usersService.updateProfile(_userIdOrEmail, data)
  },

  async getPendingApplicants(): Promise<UserProfile[]> {
    await delay(200)
    const users = await apiFetch<any[]>('/admin/registrations')
    return users.map(apiToProfile)
  },

  async reviewApplicant(userId: string, decision: 'approved' | 'rejected', reason?: string): Promise<void> {
    await delay(400)
    await apiFetch(`/admin/users/${userId}/approve`, {
      method: 'PUT',
      body: JSON.stringify({ decision, rejectionReason: reason }),
    })
  },

  async uploadDocuments(_userIdOrEmail: string, formData: FormData): Promise<void> {
    await apiUpload('/users/me/documents', formData)
  },
}