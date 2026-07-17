import { Router } from 'express';
import {
  getMyThreads,
  getThreadMessages,
  sendMessage,
  getUnreadCount,
  getAdminUser,
  getChatableUsers,
} from '../controllers/chat.controller';
import { protect } from '../middleware/auth';

const router = Router();

router.get('/threads',          protect, getMyThreads);
router.get('/messages/:userId', protect, getThreadMessages);
router.post('/send',            protect, sendMessage);
router.get('/unread',           protect, getUnreadCount);
router.get('/admin',            protect, getAdminUser);
router.get('/users',            protect, getChatableUsers);

export default router;