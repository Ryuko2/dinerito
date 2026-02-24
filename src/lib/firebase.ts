/**
 * WARNING: Changing collection names or field names in Firestore-related code
 * will break existing user data. Always write a migration before deploying.
 */
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);

// Validate config in development - missing env vars cause silent Firestore failures
if (import.meta.env.DEV && !firebaseConfig.projectId) {
  console.warn(
    '[Firebase] Missing VITE_FIREBASE_* env vars. Create .env.local from .env.example and add your Firebase config.'
  );
}

export default app;
