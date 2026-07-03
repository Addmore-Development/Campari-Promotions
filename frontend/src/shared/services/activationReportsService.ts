import { apiFetch, apiUpload, API_BASE_URL } from './api'
import type { ActivationReport, ShotKey } from '../types/activationReport.types'

export interface SubmitActivationReportPayload {
  unitsServed: string
  conversions: string
  insights: string
  feedback: string
  status: 'draft' | 'submitted'
  shots: Partial<Record<ShotKey, File>>
}

export interface ActivationReportFilters {
  status?: 'draft' | 'submitted' | 'all'
  clientId?: string
  jobId?: string
  dateFrom?: string
  dateTo?: string
}

export interface ClientActivationSummary {
  client: { id: string; name: string; email: string; industry: string }
  totalActivations: number
  reportsSubmitted: number
  totalServed: number
  totalConversions: number
  activations: Array<{
    jobId: string
    title: string
    brand: string
    venue: string
    city: string | null
    date: string
    status: string
    report: ActivationReport | null
  }>
}

export type CampaignOutcome = 'successful' | 'failed' | 'pending'

export interface CampaignInsights {
  totalActivations: number
  successful: number
  failed: number
  pending: number
  successRate: number
  activations: Array<{
    jobId: string
    title: string
    brand: string
    client: string
    date: string
    status: string
    outcome: CampaignOutcome
    unitsServed: number
    conversions: number
  }>
}

export const activationReportsService = {
  // Admin: all activations, or scoped to one client via ?clientId=
  // Business: automatically scoped to their own activations.
  getInsights: (opts?: { clientId?: string; dateFrom?: string; dateTo?: string }): Promise<CampaignInsights> => {
    const qs = new URLSearchParams()
    if (opts?.clientId) qs.set('clientId', opts.clientId)
    if (opts?.dateFrom) qs.set('dateFrom', opts.dateFrom)
    if (opts?.dateTo) qs.set('dateTo', opts.dateTo)
    const suffix = qs.toString() ? `?${qs.toString()}` : ''
    return apiFetch<CampaignInsights>(`/activation-reports/insights${suffix}`)
  },

  // Business: self-serve version of the admin client report, scoped to their
  // own jobs — number of activations, serves/conversions, insights, feedback
  // and the 3-shot image set per activation.
  getMyClientReport: (dateFrom?: string, dateTo?: string): Promise<ClientActivationSummary> => {
    const qs = new URLSearchParams()
    if (dateFrom) qs.set('dateFrom', dateFrom)
    if (dateTo) qs.set('dateTo', dateTo)
    const suffix = qs.toString() ? `?${qs.toString()}` : ''
    return apiFetch<ClientActivationSummary>(`/activation-reports/my-client-report${suffix}`)
  },

  // Promoter/supervisor: fetch the current report for a job (404 → none yet)
  getForJob: (jobId: string): Promise<ActivationReport> =>
    apiFetch<ActivationReport>(`/activation-reports/job/${jobId}`),

  // Admin: every submitted/draft report across all activations, filterable
  // by status, client, job, and date range — the base data for per-activation
  // reporting (serves/conversions/insights/feedback/images).
  getAll: (filters?: ActivationReportFilters): Promise<ActivationReport[]> => {
    const qs = new URLSearchParams()
    if (filters?.status) qs.set('status', filters.status)
    if (filters?.clientId) qs.set('clientId', filters.clientId)
    if (filters?.jobId) qs.set('jobId', filters.jobId)
    if (filters?.dateFrom) qs.set('dateFrom', filters.dateFrom)
    if (filters?.dateTo) qs.set('dateTo', filters.dateTo)
    const suffix = qs.toString() ? `?${qs.toString()}` : ''
    return apiFetch<ActivationReport[]>(`/activation-reports${suffix}`)
  },

  // Admin: auto-generated client report — activation count + totals across a
  // period, so a client-facing report can be pulled with one click.
  getClientReport: (clientId: string, dateFrom?: string, dateTo?: string): Promise<ClientActivationSummary> => {
    const qs = new URLSearchParams({ clientId })
    if (dateFrom) qs.set('dateFrom', dateFrom)
    if (dateTo) qs.set('dateTo', dateTo)
    return apiFetch<ClientActivationSummary>(`/activation-reports/client-report?${qs.toString()}`)
  },

  // Promoter/supervisor: save a draft or do the final submit.
  // Only the shot files actually provided get uploaded/replaced — earlier
  // saved shots are preserved server-side if omitted on a later save.
  save: (jobId: string, payload: SubmitActivationReportPayload): Promise<ActivationReport> => {
    const fd = new FormData()
    fd.append('unitsServed', payload.unitsServed || '0')
    fd.append('conversions', payload.conversions || '0')
    fd.append('insights', payload.insights || '')
    fd.append('feedback', payload.feedback || '')
    fd.append('status', payload.status)
    Object.entries(payload.shots).forEach(([key, file]) => {
      if (file) fd.append(key, file)
    })
    return apiUpload(`/activation-reports/job/${jobId}`, fd) as Promise<ActivationReport>
  },
}

// Shot URLs come back as server-relative paths (e.g. /uploads/activation-shots/xyz.jpg)
export function resolveShotUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined
  if (url.startsWith('http')) return url
  return `${API_BASE_URL.replace(/\/api$/, '')}${url}`
}
