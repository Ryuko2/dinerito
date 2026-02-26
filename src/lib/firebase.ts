/**
 * WARNING: Changing collection names or field names in Firestore-related code
 * will break existing user data. Always write a migration before deploying.
 *
 * Connection reliability notes:
 * - Uses persistentLocalCache for offline support; data syncs when connection returns
 * - If ERR_CONNECTION_CLOSED or WebChannel errors: check Firebase quotas (Spark plan limits),
 *   Firestore security rules, and that VITE_FIREBASE_PROJECT_ID matches the correct project
 */
import { initializeApp, getApps, getApp } from "firebase/app";
import {
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

let db: ReturnType<typeof getFirestore>;
try {
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
  });
} catch (err) {
  console.warn("[Firebase] Firestore already initialized, using existing instance", err);
  db = getFirestore(app);
}

export { db };

// Validate config in development - missing env vars cause silent Firestore failures
if (import.meta.env.DEV && !firebaseConfig.projectId) {
  console.warn(
    "[Firebase] Missing VITE_FIREBASE_* env vars. Create .env.local from .env.example and add your Firebase config."
  );
}

export default app;
