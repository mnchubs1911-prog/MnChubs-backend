import express from 'express';
import admin from '../config/firebase-admin.js';

const router = express.Router();

// Returns Firebase initialization status and masked env var info
router.get('/firebase-status', (req, res) => {
  try {
    const firebaseInitialized = Array.isArray(admin?.apps) && admin.apps.length > 0;

    const mask = (v) => {
      if (!v) return null;
      const s = String(v).trim();
      if (s.length <= 6) return '******';
      return `${s.slice(0, 3)}...${s.slice(-3)}`;
    };

    const info = {
      firebaseInitialized,
      FIREBASE_PROJECT_ID: mask(process.env.FIREBASE_PROJECT_ID),
      FIREBASE_CLIENT_EMAIL: mask(process.env.FIREBASE_CLIENT_EMAIL),
      FIREBASE_PRIVATE_KEY_SET: !!process.env.FIREBASE_PRIVATE_KEY,
    };

    console.log('Debug /firebase-status', info);
    return res.status(200).json({ success: true, data: info });
  } catch (err) {
    console.error('Error in /debug/firebase-status', err);
    return res.status(500).json({ success: false, message: 'Debug endpoint failed' });
  }
});

export default router;
