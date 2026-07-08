import express from 'express';
import {
  registerAsMentor,
  findMentors,
  requestMentorship,
  acceptMentorship,
  completeMentorship,
  addSession,
  addFeedback,
} from '../controllers/mentorship.controller.js';
import { protect } from '../middlewares/auth.js';

const router = express.Router();

router.use(protect);

router.post('/register-mentor', registerAsMentor);
router.get('/mentors', findMentors);
router.post('/request', requestMentorship);
router.put('/:id/accept', acceptMentorship);
router.put('/:id/complete', completeMentorship);
router.post('/:id/sessions', addSession);
router.post('/:id/feedback', addFeedback);

export default router;
