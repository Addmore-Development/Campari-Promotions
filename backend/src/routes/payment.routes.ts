import { Router } from 'express';
import {
  getMyPayments,
  getBusinessPayments,
  getAllPayments,
  markAsPaid,
  approvePayment,
  batchPay,
  getPaymentSummary,
} from '../controllers/payment.controller';
import { protect, adminOnly } from '../middleware/auth';

const router = Router();

// Promoter — own payments
router.get('/my',            protect, getMyPayments);

// Business — payments for their jobs + mark as paid
router.get('/business',      protect, getBusinessPayments);
router.put('/:id/mark-paid', protect, markAsPaid);          // Business OR Admin

// Admin — all payments
router.get('/summary',       protect, adminOnly, getPaymentSummary);
router.get('/',              protect, adminOnly, getAllPayments);
router.put('/:id/approve',   protect, adminOnly, approvePayment);
router.post('/batch-pay',    protect, adminOnly, batchPay);

export default router;