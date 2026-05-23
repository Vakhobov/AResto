import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env?.VITE_FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN || process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env?.VITE_FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env?.VITE_FIREBASE_STORAGE_BUCKET || process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env?.VITE_FIREBASE_MESSAGING_SENDER_ID || process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env?.VITE_FIREBASE_APP_ID || process.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

async function test() {
  try {
    console.log('Attempting to create user...');
    await createUserWithEmailAndPassword(auth, 'superadmin@aresto.com', 'Admin1234!');
    console.log('Created successfully');
  } catch (e: any) {
    console.log('Create failed:', e.code, e.message);
    if (e.code === 'auth/email-already-in-use') {
      try {
        console.log('Attempting to sign in...');
        await signInWithEmailAndPassword(auth, 'superadmin@aresto.com', 'Admin1234!');
        console.log('Signed in successfully');
      } catch (signinErr: any) {
        console.log('Sign in failed:', signinErr.code, signinErr.message);
      }
    }
  }
}

test();
