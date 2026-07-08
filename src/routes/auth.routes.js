import express from 'express';
import {
  register,
  login,
  googleLogin,
  verifyEmail,
  forgotPassword,
  resetPassword,
  refreshToken,
  logout,
  getMe,
} from '../controllers/auth.controller.js';
import { protect } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { registerValidation, loginValidation } from '../utils/validators.js';

const router = express.Router();

router.post('/register', registerValidation, validate, register);
router.post('/login', loginValidation, validate, login);
router.post('/google-login', googleLogin);
router.get('/verify-email/:token', verifyEmail);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);
router.post('/refresh-token', refreshToken);
router.post('/logout', logout);
router.get('/me', protect, getMe);

export default router;
