import { Router } from 'express';
import {
  getMyThreads,
  getThreadMessages,
  sendMessage,
  getUnreadCount,
  getAdminUser,
  getChatableUsers,
  getMyChatRequestStatus,
  getPendingChatRequests,
  respondToChatRequest,
  resendChatRequest,
} from '../controllers/chat.controller';
import { protect } from '../middleware/auth';

const router = Router();

router.get('/threads',          protect, getMyThreads);
router.get('/messages/:userId', protect, getThreadMessages);
router.post('/send',            protect, sendMessage);
router.get('/unread',           protect, getUnreadCount);
router.get('/admin',            protect, getAdminUser);
router.get('/users',            protect, getChatableUsers);

// â”€â”€ Instagram-DM-style message request gating (Supervisor/Promoter/Business -> Admin) â”€â”€
router.get('/requests/mine',              protect, getMyChatRequestStatus);
router.get('/requests',                   protect, getPendingChatRequests);
router.post('/requests/:supervisorId/respond', protect, respondToChatRequest);
router.post('/requests/resend',           protect, resendChatRequest);

export default router;