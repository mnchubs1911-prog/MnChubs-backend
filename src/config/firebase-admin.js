/**
 * Firebase Admin SDK Configuration
 * Used for verifying Google Sign-In tokens.
 */
import admin from 'firebase-admin';

let firebaseApp;

const rawProjectId = process.env.FIREBASE_PROJECT_ID;
let rawClientEmail = process.env.FIREBASE_CLIENT_EMAIL;
let rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY;

const projectId = rawProjectId && String(rawProjectId).trim();
if (rawClientEmail) rawClientEmail = String(rawClientEmail).trim();
if (rawPrivateKey) rawPrivateKey = String(rawPrivateKey).trim();

// Remove surrounding quotes if someone copied the JSON value with quotes
if (rawClientEmail && /^\s*".*"\s*$/.test(rawClientEmail)) {
  rawClientEmail = rawClientEmail.replace(/^\s*"(.*)"\s*$/, '$1');
}
// Private key often contains literal \n; convert to real newlines and strip surrounding quotes
let privateKey = undefined;
if (rawPrivateKey) {
  if (/^\s*".*"\s*$/.test(rawPrivateKey)) {
    rawPrivateKey = rawPrivateKey.replace(/^\s*"(.*)"\s*$/, '$1');
  }
  privateKey = rawPrivateKey.replace(/\\n/g, '\n');
}
const clientEmail = rawClientEmail;

try {
  if (!projectId || !clientEmail || !privateKey) {
    const missing = [];
    if (!projectId) missing.push('FIREBASE_PROJECT_ID');
    if (!clientEmail) missing.push('FIREBASE_CLIENT_EMAIL');
    if (!privateKey) missing.push('FIREBASE_PRIVATE_KEY');
    throw new Error(`Missing Firebase env vars: ${missing.join(', ')}`);
  }

  firebaseApp = admin.initializeApp({
    credential: admin.credential.cert({
      // firebase-admin cert() requires snake_case keys
      project_id: projectId,
      client_email: clientEmail,
      private_key: privateKey,
    }),
  });
  console.log('✅ Firebase Admin initialized');
} catch (err) {
  console.warn(`⚠️  Firebase init failed (Google auth will be unavailable): ${err.message}`);
}

/**
 * Verify a Firebase ID token from the client.
 * @param {string} idToken - The Firebase ID token string.
 * @returns {Promise<admin.auth.DecodedIdToken>}
 */
export const verifyFirebaseToken = async (idToken) => {
  if (!firebaseApp) throw new Error('Firebase not initialised');
  return admin.auth().verifyIdToken(idToken);
};

export default admin;
