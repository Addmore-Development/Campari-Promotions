// ── Purchase Order / Commitment Entry (CE) budget-tracking types ────────────
// A Client releases a PO for a set amount over a period (e.g. a quarter).
// Each time a job/activation is booked against that PO, a Commitment Entry
// is logged so admins can track pending/approved/cancelled spend.

export type POStatus = 'active' | 'closed' | 'cancelled'
export type CEStatus = 'pending' | 'approved' | 'cancelled'

export interface PurchaseOrder {
  id: string
  clientId: string
  poNumber: string
  amount: number
  periodStart: string
  periodEnd: string
  description: string | null
  status: POStatus
  createdBy: string
  createdAt: string
  updatedAt: string
  client?: { id: string; name: string; email: string; industry: string }
  commitments?: CommitmentEntry[]
  committedAmount: number
  approvedAmount: number
  pendingAmount: number
  cancelledAmount: number
  remainingAmount: number
  percentCommitted: number
}

export interface MyBudgetSummary {
  hasClientRecord: boolean
  message?: string
  client?: { id: string; name: string }
  purchaseOrders: PurchaseOrder[]
  totalBudget: number
  totalCommitted: number
  totalRemaining: number
}

export interface CommitmentEntry {
  id: string
  purchaseOrderId: string
  jobId: string | null
  ceNumber: string | null
  amount: number
  status: CEStatus
  notes: string | null
  createdBy: string
  approvedBy: string | null
  approvedAt: string | null
  createdAt: string
  updatedAt: string
  purchaseOrder?: { id: string; poNumber: string; client?: { id: string; name: string } }
  job?: { id: string; title: string; brand: string; venue: string; date: string } | null
}
