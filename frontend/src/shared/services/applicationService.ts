// src/shared/services/applicationService.ts
// API shim — exact same signatures as original localStorage version.
// Components call applicationService.apply(job.id, user.id) etc. unchanged.

import { apiFetch } from './api'
import type { JobApplication } from '../types/job.types'

const delay = (ms: number) => new Promise(r => setTimeout(r, ms))

function apiToApp(a: any): JobApplication {
  return {
    id:          a.id,
    jobId:       a.jobId,
    promoterId:  a.promoterId,
    status:      (a.status?.toLowerCase() || 'standby') as JobApplication['status'],
    appliedAt:   a.appliedAt || new Date().toISOString(),
  }
}

export const applicationService = {

  async apply(jobId: string, _promoterId: string): Promise<JobApplication> {
    await delay(400)
    const app = await apiFetch<any>('/applications', {
      method: 'POST',
      body: JSON.stringify({ jobId }),
    })
    return apiToApp(app)
  },

  async getApplications(_promoterId: string): Promise<JobApplication[]> {
    await delay(200)
    const apps = await apiFetch<any[]>('/applications/my')
    return apps.map(apiToApp)
  },

  async updateApplicationStatus(id: string, status: JobApplication['status']): Promise<void> {
    await delay(300)
    await apiFetch(`/applications/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status: status.toUpperCase() }),
    })
  },

  async allocateFromStandby(jobId: string): Promise<JobApplication | null> {
    await delay(300)
    try {
      const apps = await apiFetch<any[]>(`/applications/job/${jobId}`)
      const standby = apps.find((a: any) => a.status?.toLowerCase() === 'standby')
      if (!standby) return null
      await apiFetch(`/applications/${standby.id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'ALLOCATED' }),
      })
      return apiToApp({ ...standby, status: 'ALLOCATED' })
    } catch {
      return null
    }
  },

  // Returns same shape as original: { allocated: JobApplication[], notified: JobApplication[] }
  async checkForOpenSlots(_promoterId: string): Promise<{ allocated: JobApplication[]; notified: JobApplication[] }> {
    await delay(200)
    // The API handles allocation automatically on apply.
    // Just return the current state of the promoter's applications.
    try {
      const apps = await apiFetch<any[]>('/applications/my')
      const allocated = apps
        .filter((a: any) => a.status?.toLowerCase() === 'allocated')
        .map(apiToApp)
      return { allocated, notified: [] }
    } catch {
      return { allocated: [], notified: [] }
    }
  },
}