import express from 'express';
import {
  createListing,
  getListings,
  getListing,
  updateListing,
  deleteListing,
  markAsSold,
  getMyListings,
} from '../controllers/marketplace.controller.js';
import { protect, optionalAuth } from '../middlewares/auth.js';
import { uploadMultiple } from '../middlewares/upload.js';

const router = express.Router();

router.get('/', getListings);
router.get('/:id', optionalAuth, getListing);

router.post('/', protect, uploadMultiple, createListing);
router.get('/my/listings', protect, getMyListings);
router.put('/:id', protect, updateListing);
router.delete('/:id', protect, deleteListing);
router.put('/:id/sold', protect, markAsSold);

export default router;
