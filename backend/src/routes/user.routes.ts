import { Router } from 'express';
import {
  getAllUsers,
  getUserById,
  updateMyProfile,
  uploadDocuments,
  uploadDocumentsByUserId,
  documentUpload,
  adminUpdateUser,
  adminCreateUser,
  deleteUser,
  getEligiblePromoters,
} from '../controllers/user.controller';
import { protect, adminOnly, adminOrBusiness } from '../middleware/auth';

const router = Router();

// ── Own profile ──────────────────────────────────────────────────────────────
router.get('/me',            protect, getUserById);
router.put('/me/profile',    protect, updateMyProfile);
router.post('/me/documents', protect, documentUpload, uploadDocuments);

// FIX: register-documents route used by RegisterPage right after account creation
router.post('/register-documents/:id', protect, documentUpload, uploadDocumentsByUserId);

// FIX: eligible promoters — opened to ADMIN and BUSINESS (was adminOnly which
// blocked the business dashboard from loading promoters for a job).
// Also added /promoters/eligible alias because BusinessJobs.tsx calls that path.
router.get('/eligible',           protect, adminOrBusiness, getEligiblePromoters);
router.get('/promoters/eligible', protect, adminOrBusiness, getEligiblePromoters);

// ── Admin: all users ─────────────────────────────────────────────────────────
router.get('/',       protect, adminOnly, getAllUsers);
router.post('/',      protect, adminOnly, adminCreateUser);
router.get('/:id',    protect, adminOnly, getUserById);
router.put('/:id',    protect, adminOnly, adminUpdateUser);
router.delete('/:id', protect, adminOnly, deleteUser);

export default router;