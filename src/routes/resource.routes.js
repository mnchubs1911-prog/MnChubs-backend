import express from 'express';
import {
  createResource,
  getResources,
  getResource,
  updateResource,
  deleteResource,
  upvoteResource,
  downvoteResource,
  downloadResource,
  getTopResources,
  getRecentResources,
  requestResource,
} from '../controllers/resource.controller.js';
import { protect, optionalAuth } from '../middlewares/auth.js';
import { uploadSingle } from '../middlewares/upload.js';
import { validate } from '../middlewares/validate.js';
import { resourceValidation } from '../utils/validators.js';

const router = express.Router();

// Public routes
router.get('/', getResources);
router.get('/top', getTopResources);
router.get('/recent', getRecentResources);
router.get('/:slug', optionalAuth, getResource);
router.get('/:id/download', downloadResource);

import { authorize } from '../middlewares/roles.js';

// Protected routes
router.post('/', protect, authorize('admin', 'moderator'), uploadSingle, resourceValidation, validate, createResource);
router.put('/:id', protect, updateResource);
router.delete('/:id', protect, deleteResource);
router.post('/:id/upvote', protect, upvoteResource);
router.post('/:id/downvote', protect, downvoteResource);
router.post('/request', protect, requestResource);

export default router;
