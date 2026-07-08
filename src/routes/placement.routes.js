import express from 'express';
import {
  createExperience,
  getExperiences,
  getExperience,
  updateExperience,
  deleteExperience,
  upvote,
  downvote,
  getCompanyWise,
} from '../controllers/placement.controller.js';
import { protect } from '../middlewares/auth.js';
import { authorize } from '../middlewares/roles.js';

const router = express.Router();

router.get('/', getExperiences);
router.get('/:id', getExperience);
router.get('/company/:company', getCompanyWise);

router.post('/', protect, authorize('admin', 'moderator'), createExperience);
router.put('/:id', protect, updateExperience);
router.delete('/:id', protect, deleteExperience);
router.post('/:id/upvote', protect, upvote);
router.post('/:id/downvote', protect, downvote);

export default router;
