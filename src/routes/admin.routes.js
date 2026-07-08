import express from 'express';
import {
  getDashboardStats,
  getUsers,
  updateUserRole,
  deleteUser,
  getPendingResources,
  approveResource,
  rejectResource,
  getAnalytics,
} from '../controllers/admin.controller.js';
import { protect } from '../middlewares/auth.js';
import { authorize } from '../middlewares/roles.js';

const router = express.Router();

router.use(protect);
router.use(authorize('admin', 'moderator')); // Require admin or moderator credentials

router.get('/stats', getDashboardStats);
router.get('/users', getUsers);
router.put('/users/:id/role', updateUserRole);
router.delete('/users/:id', deleteUser);

router.get('/resources/pending', getPendingResources);
router.put('/resources/:id/approve', approveResource);
router.put('/resources/:id/reject', rejectResource);

router.get('/analytics', getAnalytics);

export default router;
