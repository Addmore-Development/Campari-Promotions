import { apiFetch } from './api'
import type { PurchaseOrder, CommitmentEntry, POStatus, CEStatus } from '../types/purchaseOrder.types'

export interface CreatePOPayload {
  clientId: string
  poNumber: string
  amount: number
  periodStart: string
  periodEnd: string
  description?: string
}

export interface CreateCEPayload {
  purchaseOrderId: string
  jobId?: string
  ceNumber?: string
  amount: number
  notes?: string
  allowOverride?: boolean
}

export const purchaseOrdersService = {
  getAll: (filters?: { clientId?: string; status?: POStatus | 'all' }): Promise<PurchaseOrder[]> => {
    const qs = new URLSearchParams()
    if (filters?.clientId) qs.set('clientId', filters.clientId)
    if (filters?.status) qs.set('status', filters.status)
    const suffix = qs.toString() ? `?${qs.toString()}` : ''
    return apiFetch<PurchaseOrder[]>(`/purchase-orders${suffix}`)
  },

  getById: (id: string): Promise<PurchaseOrder> =>
    apiFetch<PurchaseOrder>(`/purchase-orders/${id}`),

  create: (payload: CreatePOPayload): Promise<PurchaseOrder> =>
    apiFetch<PurchaseOrder>(`/purchase-orders`, { method: 'POST', body: JSON.stringify(payload) }),

  update: (id: string, payload: Partial<CreatePOPayload> & { status?: POStatus }): Promise<PurchaseOrder> =>
    apiFetch<PurchaseOrder>(`/purchase-orders/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),

  getCommitments: (filters?: { purchaseOrderId?: string; jobId?: string; status?: CEStatus | 'all'; clientId?: string }): Promise<CommitmentEntry[]> => {
    const qs = new URLSearchParams()
    if (filters?.purchaseOrderId) qs.set('purchaseOrderId', filters.purchaseOrderId)
    if (filters?.jobId) qs.set('jobId', filters.jobId)
    if (filters?.status) qs.set('status', filters.status)
    if (filters?.clientId) qs.set('clientId', filters.clientId)
    const suffix = qs.toString() ? `?${qs.toString()}` : ''
    return apiFetch<CommitmentEntry[]>(`/purchase-orders/commitments${suffix}`)
  },

  createCommitment: (payload: CreateCEPayload): Promise<CommitmentEntry> =>
    apiFetch<CommitmentEntry>(`/purchase-orders/commitments`, { method: 'POST', body: JSON.stringify(payload) }),

  updateCommitment: (id: string, payload: { status?: CEStatus; amount?: number; notes?: string; ceNumber?: string }): Promise<CommitmentEntry> =>
    apiFetch<CommitmentEntry>(`/purchase-orders/commitments/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
}
