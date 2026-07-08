import express from 'express';
import {
  createEvent,
  getEvents,
  getEvent,
  updateEvent,
  deleteEvent,
  getUpcoming,
} from '../controllers/event.controller.js';
import { protect } from '../middlewares/auth.js';
import { authorize } from '../middlewares/roles.js';
import { uploadSingle } from '../middlewares/upload.js';

const router = express.Router();

router.get('/', getEvents);
router.get('/upcoming', getUpcoming);
router.get('/:id', getEvent);

router.post('/', protect, authorize('admin', 'moderator'), uploadSingle, createEvent);
router.put('/:id', protect, uploadSingle, updateEvent);
router.delete('/:id', protect, deleteEvent);

export default router;
