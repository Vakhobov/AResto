import { initializeApp } from 'firebase/app';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const missingKeys = Object.entries(firebaseConfig)
  .filter(([, v]) => !v)
  .map(([k]) => k);

if (missingKeys.length > 0) {
  console.error('❌ Firebase config incomplete. Missing:', missingKeys.join(', '));
  throw new Error(`Firebase configuration missing required keys: ${missingKeys.join(', ')}`);
}

export const app  = initializeApp(firebaseConfig);
export const db   = getFirestore(app);
export const auth = getAuth(app);

/**
 * Enable offline persistence (IndexedDB) for Firestore.
 * Allows the app to work for 12+ hours offline with local caching.
 * 
 * This must be called before any Firestore operations.
 */
export async function enableOfflinePersistence(): Promise<void> {
  try {
    await enableIndexedDbPersistence(db);
    console.log('✅ Firestore offline persistence enabled');
  } catch (err: any) {
    if (err.code === 'failed-precondition') {
      // Multiple tabs open with the same database
      console.warn(
        '⚠️  Multiple tabs open - offline persistence disabled for this tab. ' +
        'Close other tabs or this feature will not work optimally.',
      );
    } else if (err.code === 'unimplemented') {
      // Browser doesn't support IndexedDB
      console.warn('⚠️  IndexedDB not supported in this browser - offline mode disabled');
    } else {
      console.error('❌ Failed to enable offline persistence:', err);
    }
  }
}
