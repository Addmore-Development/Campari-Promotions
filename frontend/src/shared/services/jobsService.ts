// src/shared/services/jobsService.ts
// API shim — exact same signatures as original localStorage version.
// Returns Job objects with nested coordinates: { lat, lng } as components expect.

import { apiFetch } from './api'
import type { Job, JobApplication } from '../types/job.types'

const delay = (ms: number) => new Promise(r => setTimeout(r, ms))

// ── Shape adapter: API flat lat/lng → Job with nested coordinates ─────────────
function apiToJob(j: any): Job {
  return {
    id:          j.id,
    title:       j.title       || '',
    client:      j.client      || '',
    brand:       j.brand       || '',
    venue:       j.venue       || '',
    address:     j.address     || '',

    // API stores lat/lng flat — components access job.coordinates.lat
    coordinates: { lat: j.lat || 0, lng: j.lng || 0 },

    date:        j.date        || '',
    startTime:   j.startTime   || '',
    endTime:     j.endTime     || '',
    hourlyRate:  j.hourlyRate  || 0,
    totalSlots:  j.totalSlots  || 0,
    filledSlots: j.filledSlots || 0,
    filters:     j.filters     || {},

    // API returns 'OPEN' — components expect 'open'
    status: (j.status?.toLowerCase() || 'open') as Job['status'],

    createdBy:  j.createdBy  || j.createdByUser?.id || '',
    createdAt:  j.createdAt  || new Date().toISOString(),
    distanceKm: j.distanceKm || undefined,
  }
}

export const jobsService = {

  async getAvailableJobs(_promoterId?: string): Promise<Job[]> {
    try {
      const jobs = await apiFetch<any[]>('/jobs')
      return jobs
        .filter(j => ['OPEN', 'FILLED', 'IN_PROGRESS', 'open', 'filled', 'in_progress'].includes(j.status || 'OPEN'))
        .map(apiToJob)
    } catch (err) {
      console.error('[jobsService] getAvailableJobs error:', err)
      return []
    }
  },

  async getJobById(jobId: string): Promise<Job | null> {
    await delay(150)
    try {
      const j = await apiFetch<any>(`/jobs/${jobId}`)
      return apiToJob(j)
    } catch {
      return null
    }
  },

  async applyForJob(jobId: string, _promoterId: string): Promise<JobApplication> {
    await delay(600)
    const app = await apiFetch<any>('/applications', {
      method: 'POST',
      body: JSON.stringify({ jobId }),
    })
    return {
      id:          app.id,
      jobId:       app.jobId,
      promoterId:  app.promoterId,
      status:      (app.status?.toLowerCase() || 'standby') as JobApplication['status'],
      appliedAt:   app.appliedAt || new Date().toISOString(),
    }
  },

  async upsertJob(data: Partial<Job> & { id?: string }): Promise<Job> {
    await delay(500)
    // Flatten coordinates back to lat/lng for the API
    const payload: any = { ...data }
    if (data.coordinates) {
      payload.lat = data.coordinates.lat
      payload.lng = data.coordinates.lng
      delete payload.coordinates
    }
    // Uppercase status for API
    if (payload.status) payload.status = payload.status.toUpperCase()

    if (data.id) {
      const j = await apiFetch<any>(`/jobs/${data.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      })
      return apiToJob(j)
    }
    const j = await apiFetch<any>('/jobs', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    return apiToJob(j)
  },

  async deleteJob(jobId: string): Promise<void> {
    await delay(300)
    await apiFetch(`/jobs/${jobId}`, { method: 'DELETE' })
  },
}