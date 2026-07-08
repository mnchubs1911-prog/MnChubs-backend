import express from 'express';
import {
  createProject,
  getProjects,
  getProject,
  updateProject,
  deleteProject,
  joinCollaboration,
  leaveCollaboration,
  getProjectIdeas,
} from '../controllers/research.controller.js';
import { protect } from '../middlewares/auth.js';
import { authorize } from '../middlewares/roles.js';

const router = express.Router();

router.get('/', getProjects);
router.get('/ideas', getProjectIdeas);
router.get('/:id', getProject);

router.post('/', protect, authorize('admin', 'moderator'), createProject);
router.put('/:id', protect, updateProject);
router.delete('/:id', protect, deleteProject);
router.post('/:id/join', protect, joinCollaboration);
router.post('/:id/leave', protect, leaveCollaboration);

export default router;
