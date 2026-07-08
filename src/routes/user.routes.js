import express from 'express';
import {
  getProfile,
  updateProfile,
  updateAvatar,
  getBookmarks,
  addBookmark,
  removeBookmark,
  getRecentlyViewed,
  getLeaderboard,
  searchUsers,
  sendConnectRequest,
} from '../controllers/user.controller.js';
import { protect } from '../middlewares/auth.js';
import { uploadSingle } from '../middlewares/upload.js';

const router = express.Router();

router.use(protect); // All user routes require authentication

router.get('/bookmarks', getBookmarks);
router.post('/bookmarks/:resourceId', addBookmark);
router.delete('/bookmarks/:resourceId', removeBookmark);

router.get('/recently-viewed', getRecentlyViewed);
router.get('/leaderboard', getLeaderboard);
router.get('/search', searchUsers);

router.post('/connect/:userId', sendConnectRequest);

router.get('/profile/:id', getProfile);
router.put('/profile', updateProfile);
router.put('/avatar', uploadSingle, updateAvatar);

export default router;
