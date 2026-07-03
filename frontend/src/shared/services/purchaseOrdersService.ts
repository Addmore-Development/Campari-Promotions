import { apiFetch } from './api'
import type { PurchaseOrder, CommitmentEntry, POStatus, CEStatus, MyBudgetSummary } from '../types/purchaseOrder.types'

export interface CreatePOPayload {
  clientId: string
  // Optional — server auto-generates a PO-YYYYMM-XXXX number when omitted
  poNumber?: string
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
  // Client (BUSINESS) sees their own remaining budget; admin can pass a clientId
  // to check budget on a client's behalf.
  getMyBudget: (clientId?: string): Promise<MyBudgetSummary> => {
    const suffix = clientId ? `?clientId=${clientId}` : ''
    return apiFetch<MyBudgetSummary>(`/purchase-orders/my-budget${suffix}`)
  },

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
