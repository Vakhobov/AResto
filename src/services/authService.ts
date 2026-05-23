import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  Timestamp,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { AuthUser } from '@/types/auth';

const USERS_COLLECTION = 'users';

interface FirestoreUser {
  fullName: string;
  username: string;
  password: string; // plaintext for demo
  role: AuthUser['role'];
  branchId: string | null;
  active: boolean;
  createdAt: Timestamp;
}

const fromFirestoreUser = (id: string, data: Record<string, unknown>): AuthUser => ({
  id,
  fullName: String(data.fullName ?? ''),
  username: String(data.username ?? ''),
  role: (data.role as AuthUser['role']) ?? 'kitchen',
  branchId: data.branchId ? String(data.branchId) : null,
  active: Boolean(data.active ?? true),
});

/**
 * Attempt to log in with username + password.
 * Returns AuthUser on success, throws on failure.
 */
export const loginUser = async (
  username: string,
  password: string,
): Promise<AuthUser> => {
  const q = query(
    collection(db, USERS_COLLECTION),
    where('username', '==', username.trim()),
    where('active', '==', true),
  );
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    throw new Error('Foydalanuvchi topilmadi');
  }

  const userDoc = snapshot.docs[0];
  const data = userDoc.data() as FirestoreUser;

  if (data.password !== password) {
    throw new Error('Parol noto\'g\'ri');
  }

  return fromFirestoreUser(userDoc.id, data as unknown as Record<string, unknown>);
};

/** Fetch a user by Firestore doc ID. */
export const getUserById = async (id: string): Promise<AuthUser | null> => {
  try {
    const docSnap = await getDoc(doc(db, USERS_COLLECTION, id));
    if (!docSnap.exists()) return null;
    const data = docSnap.data() as Record<string, unknown>;
    if (!data.active) return null;
    return fromFirestoreUser(docSnap.id, data);
  } catch {
    return null;
  }
};
