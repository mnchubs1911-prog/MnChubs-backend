import express from 'express';
import { getPlatformStats } from '../controllers/stats.controller.js';

const router = express.Router();

router.get('/platform', getPlatformStats);

export default router;
