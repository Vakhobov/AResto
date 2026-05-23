/**
 * userProfileService.ts
 * ──────────────────────
 * Manages Firebase Auth accounts + Firestore /users/{uid} profile documents.
 *
 * Firestore structure:
 *   /users/{uid}  →  UserProfile
 */
import {
  createUserWithEmailAndPassword,
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  updateEmail,
  updatePassword,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';
import { initializeApp, deleteApp } from 'firebase/app';
import { app, auth, db } from '@/lib/firebase';
import { UserProfile, UserRole } from '@/types/auth';

const USERS = 'users';

// ─── Firestore helpers ────────────────────────────────────────────────────────

const toDate = (v: unknown): Date => {
  if (v instanceof Timestamp) return v.toDate();
  if (v instanceof Date) return v;
  return new Date();
};

const fromFirestore = (uid: string, data: Record<string, unknown>): UserProfile => ({
  uid,
  email: String(data.email ?? ''),
  role: (data.role as UserRole) ?? 'menu',
  branchId: data.branchId ? String(data.branchId) : null,
  branchName: data.branchName ? String(data.branchName) : null,
  createdAt: toDate(data.createdAt),
});

// ─── Public API ───────────────────────────────────────────────────────────────

/** Fetch Firestore profile by Firebase UID. Returns null if not found. */
export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  const snap = await getDoc(doc(db, USERS, uid));
  if (!snap.exists()) return null;
  return fromFirestore(uid, snap.data() as Record<string, unknown>);
};

/** Write/overwrite a Firestore profile document. */
export const setUserProfile = async (profile: Omit<UserProfile, 'createdAt'>): Promise<void> => {
  await setDoc(doc(db, USERS, profile.uid), {
    email: profile.email,
    role: profile.role,
    branchId: profile.branchId ?? null,
    branchName: profile.branchName ?? null,
    createdAt: Timestamp.fromDate(new Date()),
  });
};

/**
 * Create a Firebase Auth user + Firestore profile in one call.
 * Used by SuperAdmin when provisioning kitchen/menu accounts.
 * Returns the new Firebase UID.
 */
export const createFirebaseUser = async (
  email: string,
  password: string,
  role: UserRole,
  branchId: string | null,
  branchName: string | null,
): Promise<string> => {
  const secondaryApp = initializeApp(app.options, `provision-user-${Date.now()}`);
  const secondaryAuth = getAuth(secondaryApp);

  try {
    const credential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    const uid = credential.user.uid;

    await setUserProfile({ uid, email, role, branchId, branchName });
    await signOut(secondaryAuth);
    return uid;
  } finally {
    await deleteApp(secondaryApp);
  }
};

export const updateFirebaseUserCredentials = async (
  currentEmail: string,
  currentPassword: string,
  newEmail: string,
  newPassword: string,
): Promise<string> => {
  const secondaryApp = initializeApp(app.options, `update-user-${Date.now()}`);
  const secondaryAuth = getAuth(secondaryApp);

  try {
    const credential = await signInWithEmailAndPassword(secondaryAuth, currentEmail, currentPassword);
    const user = credential.user;

    if (newEmail && newEmail !== currentEmail) {
      await updateEmail(user, newEmail);
      await updateDoc(doc(db, USERS, user.uid), { email: newEmail });
    }

    if (newPassword) {
      await updatePassword(user, newPassword);
    }

    await signOut(secondaryAuth);
    return user.uid;
  } finally {
    await deleteApp(secondaryApp);
  }
};

/**
 * Seed the superadmin Firebase Auth account + Firestore profile on first run.
 * Safe to call multiple times — skips if the account already exists.
 */
export const seedSuperAdmin = async (): Promise<void> => {
  const SUPERADMIN_EMAIL = 'superadmin@aresto.com';
  const SUPERADMIN_PASSWORD = 'Admin1234!';

  try {
    // Try to create Firebase Auth account
    const credential = await createUserWithEmailAndPassword(auth, SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD);
    const uid = credential.user.uid;

    // Write Firestore profile
    await setUserProfile({
      uid,
      email: SUPERADMIN_EMAIL,
      role: 'superadmin',
      branchId: null,
      branchName: null,
    });

    console.log('✅ SuperAdmin seeded:', SUPERADMIN_EMAIL);
  } catch (err: any) {
    if (err.code === 'auth/email-already-in-use') {
      console.log('✅ SuperAdmin already exists.');
    } else {
      console.error('Failed to seed SuperAdmin:', err);
      throw err; // Re-throw so Login.tsx knows it failed
    }
  }
};
