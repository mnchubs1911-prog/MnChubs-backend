/**
 * Firebase Admin SDK Configuration
 * Used for verifying Google Sign-In tokens.
 */
import admin from 'firebase-admin';

let firebaseApp;

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
// The private key in .env has literal \n sequences — convert them to real newlines
const privateKey = process.env.FIREBASE_PRIVATE_KEY
  ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
  : undefined;

try {
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      `Missing Firebase env vars: ${!projectId ? 'FIREBASE_PROJECT_ID ' : ''}${!clientEmail ? 'FIREBASE_CLIENT_EMAIL ' : ''}${!privateKey ? 'FIREBASE_PRIVATE_KEY' : ''}`
    );
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
