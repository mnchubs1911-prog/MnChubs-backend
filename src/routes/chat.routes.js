import express from 'express';
import {
  getConversations,
  getMessages,
  createConversation,
  sendMessage,
} from '../controllers/chat.controller.js';
import { protect } from '../middlewares/auth.js';

const router = express.Router();

router.use(protect);

router.get('/conversations', getConversations);
router.post('/conversations', createConversation);
router.get('/conversations/:id', getMessages);
router.post('/conversations/:id/messages', sendMessage);

export default router;
