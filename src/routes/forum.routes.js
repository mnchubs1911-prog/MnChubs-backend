import express from 'express';
import {
  createPost,
  getPosts,
  getPost,
  updatePost,
  deletePost,
  addAnswer,
  updateAnswer,
  deleteAnswer,
  acceptAnswer,
  upvotePost,
  downvotePost,
  upvoteAnswer,
  downvoteAnswer,
  getBranchDiscussions,
} from '../controllers/forum.controller.js';
import { protect, optionalAuth } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { forumPostValidation } from '../utils/validators.js';

const router = express.Router();

// Public routes
router.get('/', getPosts);
router.get('/:id', optionalAuth, getPost);
router.get('/branch/:branch', getBranchDiscussions);

// Protected routes
router.post('/', protect, forumPostValidation, validate, createPost);
router.put('/:id', protect, updatePost);
router.delete('/:id', protect, deletePost);

router.post('/:id/answers', protect, addAnswer);
router.put('/:id/answers/:answerId', protect, updateAnswer);
router.delete('/:id/answers/:answerId', protect, deleteAnswer);
router.post('/:id/answers/:answerId/accept', protect, acceptAnswer);

router.post('/:id/upvote', protect, upvotePost);
router.post('/:id/downvote', protect, downvotePost);
router.post('/:id/answers/:answerId/upvote', protect, upvoteAnswer);
router.post('/:id/answers/:answerId/downvote', protect, downvoteAnswer);

export default router;
