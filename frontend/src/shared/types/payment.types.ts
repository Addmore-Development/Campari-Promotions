export type PaymentStatus = 'pending' | 'approved' | 'processing' | 'paid' | 'failed';

export interface Payment {
  id: string;
  shiftId: string;
  promoterId: string;
  grossAmount: number;
  deductions: number;
  netAmount: number;
  status: PaymentStatus;
  approvedBy?: string;
  approvedAt?: string;
  paidAt?: string;
  reference?: string;
  createdAt: string;
}

export interface EarningsSummary {
  totalEarned: number;
  totalPending: number;
  totalPaid: number;
  shiftsCompleted: number;
}