// src/shared/services/paymentsService.ts
// API shim — exact same signatures as original localStorage version.
// Components call paymentsService.getEarningsSummary(user.id) etc. unchanged.

import { apiFetch } from './api'
import type { Payment, EarningsSummary } from '../types/payment.types'

const delay = (ms: number) => new Promise(r => setTimeout(r, ms))

function apiToPayment(p: any): Payment {
  return {
    id:          p.id,
    shiftId:     p.shiftId,
    promoterId:  p.promoterId,
    grossAmount: p.grossAmount || 0,
    deductions:  p.deductions  || 0,
    netAmount:   p.netAmount   || 0,
    status:      (p.status?.toLowerCase() || 'pending') as Payment['status'],
    approvedBy:  p.approvedBy  || undefined,
    approvedAt:  p.approvedAt  || undefined,
    paidAt:      p.paidAt      || undefined,
    reference:   p.reference   || undefined,
    createdAt:   p.createdAt   || new Date().toISOString(),
  }
}

export const paymentsService = {

  async getPaymentsByPromoter(_promoterId: string): Promise<Payment[]> {
    await delay(300)
    const payments = await apiFetch<any[]>('/payments/my')
    return payments.map(apiToPayment)
  },

  async getEarningsSummary(_promoterId: string): Promise<EarningsSummary> {
    await delay(200)
    const payments = await apiFetch<any[]>('/payments/my')
    const paid    = payments.filter(p => p.status?.toLowerCase() === 'paid')
    const pending = payments.filter(p =>
      p.status?.toLowerCase() === 'pending' || p.status?.toLowerCase() === 'approved'
    )
    return {
      totalEarned:     payments.reduce((s, p) => s + (p.netAmount || 0), 0),
      totalPending:    pending.reduce((s, p) => s + (p.netAmount || 0), 0),
      totalPaid:       paid.reduce((s, p) => s + (p.netAmount || 0), 0),
      shiftsCompleted: paid.length,
    }
  },

  async getAllPayments(): Promise<Payment[]> {
    await delay(300)
    const payments = await apiFetch<any[]>('/payments')
    return payments.map(apiToPayment)
  },

  async approvePayment(paymentId: string, _adminId: string): Promise<Payment> {
    await delay(500)
    const p = await apiFetch<any>(`/payments/${paymentId}/approve`, {
      method: 'PUT',
      body: JSON.stringify({}),
    })
    return apiToPayment(p)
  },

  async batchPay(paymentIds: string[]): Promise<void> {
    await apiFetch('/payments/batch-pay', {
      method: 'POST',
      body: JSON.stringify({ paymentIds }),
    })
  },
}