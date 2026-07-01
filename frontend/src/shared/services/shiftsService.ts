import { apiFetch, apiUpload } from './api'
import type { Shift } from '../types/shift.types'

const delay = (ms: number) => new Promise(r => setTimeout(r, ms))

// ── Shape adapter: API flat response → original nested Shift shape ────────────
function apiToShift(s: any): Shift {
  const issues = Array.isArray(s.issues) ? s.issues : []

  return {
    id:         s.id,
    jobId:      s.jobId,
    promoterId: s.promoterId,
    status:     (s.status?.toLowerCase() || 'scheduled') as Shift['status'],

    // Nested attendance object — this is what promoter components access
    attendance: {
      shiftId:          s.id,
      promoterId:       s.promoterId,
      jobId:            s.jobId,
      status:           (s.status?.toLowerCase() || 'scheduled') as Shift['status'],
      checkInTime:      s.checkInTime      || undefined,
      checkOutTime:     s.checkOutTime     || undefined,
      checkInSelfie:    s.checkInSelfieUrl  || undefined,
      checkOutSelfie:   s.checkOutSelfieUrl || undefined,
      totalHours:       s.totalHours       || undefined,
      supervisorRating: s.supervisorRating  || undefined,
      issues: issues.map((iss: any) => ({
        id:       iss.id       || String(Date.now()),
        type:     iss.type     || 'other',
        note:     iss.note     || '',
        loggedBy: iss.reportedBy || iss.loggedBy || '',
        loggedAt: iss.reportedAt || iss.loggedAt || new Date().toISOString(),
      })),
    },

    // Optional pay fields (these DO exist on Shift type)
    grossPay:   s.grossPay   || undefined,
    deductions: s.deductions || undefined,
    netPay:     s.netPay     || undefined,
  }
}

export const shiftsService = {

  async getShiftsByPromoter(_promoterId: string): Promise<Shift[]> {
    await delay(300)
    const shifts = await apiFetch<any[]>('/shifts/my')
    return shifts.map(apiToShift)
  },

  async getAllShifts(): Promise<Shift[]> {
    await delay(300)
    const shifts = await apiFetch<any[]>('/shifts/all')
    return shifts.map(apiToShift)
  },

  async checkIn(
    shiftId: string,
    selfieUrl: string,
    location: { lat: number; lng: number },
  ): Promise<Shift> {
    await delay(600)

    let selfieFile: File | undefined
    if (selfieUrl && selfieUrl.startsWith('data:')) {
      try {
        const [header, data] = selfieUrl.split(',')
        const mime = header.match(/:(.*?);/)?.[1] || 'image/jpeg'
        const bytes = atob(data)
        const arr = new Uint8Array(bytes.length)
        for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i)
        selfieFile = new File([arr], 'checkin.jpg', { type: mime })
      } catch { /* skip selfie if conversion fails */ }
    }

    const formData = new FormData()
    if (location?.lat != null) formData.append('lat', String(location.lat))
    if (location?.lng != null) formData.append('lng', String(location.lng))
    if (selfieFile) formData.append('selfie', selfieFile)

    const result = await apiUpload(`/shifts/${shiftId}/checkin`, formData)
    return apiToShift(result)
  },

  async checkOut(
    shiftId: string,
    selfieUrl: string,
    location: { lat: number; lng: number },
  ): Promise<Shift> {
    await delay(600)

    let selfieFile: File | undefined
    if (selfieUrl && selfieUrl.startsWith('data:')) {
      try {
        const [header, data] = selfieUrl.split(',')
        const mime = header.match(/:(.*?);/)?.[1] || 'image/jpeg'
        const bytes = atob(data)
        const arr = new Uint8Array(bytes.length)
        for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i)
        selfieFile = new File([arr], 'checkout.jpg', { type: mime })
      } catch { /* skip */ }
    }

    const formData = new FormData()
    if (location?.lat != null) formData.append('lat', String(location.lat))
    if (location?.lng != null) formData.append('lng', String(location.lng))
    if (selfieFile) formData.append('selfie', selfieFile)

    const result = await apiUpload(`/shifts/${shiftId}/checkout`, formData)
    return apiToShift(result)
  },

  async getLiveLocations(): Promise<any[]> {
    return apiFetch<any[]>('/shifts/live-locations')
  },
}