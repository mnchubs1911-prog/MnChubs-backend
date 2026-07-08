import express from 'express';
import {
  createGroup,
  getGroups,
  getGroup,
  joinGroup,
  leaveGroup,
  addResource,
  removeResource,
  getMyGroups,
} from '../controllers/studygroup.controller.js';
import { protect } from '../middlewares/auth.js';

const router = express.Router();

router.use(protect);

router.post('/', createGroup);
router.get('/', getGroups);
router.get('/my-groups', getMyGroups);
router.get('/:id', getGroup);
router.post('/:id/join', joinGroup);
router.post('/:id/leave', leaveGroup);
router.post('/:id/resources', addResource);
router.delete('/:id/resources/:resourceId', removeResource);

export default router;
