import {
  addDoc,
  collection,
  getDocs,
  orderBy,
  query,
  Timestamp,
  where,
  updateDoc,
  doc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { AuthUser } from '@/types/auth';
import { removeUndefinedFields } from '@/lib/firestoreUtils';

const USERS_COLLECTION = 'users';

export interface CreateUserInput {
  fullName: string;
  username: string;
  password: string; // plaintext for demo
  role: AuthUser['role'];
  branchId: string | null;
  active?: boolean;
}

const fromFirestoreUser = (id: string, data: Record<string, unknown>): AuthUser => ({
  id,
  fullName: String(data.fullName ?? ''),
  username: String(data.username ?? ''),
  role: (data.role as AuthUser['role']) ?? 'kitchen',
  branchId: data.branchId ? String(data.branchId) : null,
  active: Boolean(data.active ?? true),
});

export const createUser = async (input: CreateUserInput): Promise<AuthUser> => {
  const now = Timestamp.fromDate(new Date());
  const data = removeUndefinedFields({
    fullName: input.fullName,
    username: input.username,
    password: input.password,
    role: input.role,
    branchId: input.branchId ?? null,
    active: input.active ?? true,
    createdAt: now,
  });
  const docRef = await addDoc(collection(db, USERS_COLLECTION), data);
  return fromFirestoreUser(docRef.id, data as Record<string, unknown>);
};

export const getUsers = async (): Promise<AuthUser[]> => {
  const q = query(collection(db, USERS_COLLECTION), orderBy('createdAt', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => fromFirestoreUser(d.id, d.data()));
};

export const getUsersByBranch = async (branchId: string): Promise<AuthUser[]> => {
  const q = query(
    collection(db, USERS_COLLECTION),
    where('branchId', '==', branchId),
    orderBy('createdAt', 'asc'),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => fromFirestoreUser(d.id, d.data()));
};

export const updateUser = async (
  userId: string,
  data: Partial<Omit<CreateUserInput, 'username'>>,
): Promise<void> => {
  await updateDoc(
    doc(db, USERS_COLLECTION, userId),
    removeUndefinedFields({
      ...(data.fullName !== undefined && { fullName: data.fullName }),
      ...(data.password !== undefined && { password: data.password }),
      ...(data.role !== undefined && { role: data.role }),
      ...(data.branchId !== undefined && { branchId: data.branchId }),
      ...(data.active !== undefined && { active: data.active }),
    }),
  );
};

/** Seed the default superadmin account if it does not exist. */
export const seedSuperAdmin = async (): Promise<void> => {
  const q = query(
    collection(db, USERS_COLLECTION),
    where('username', '==', 'superadmin'),
  );
  const snap = await getDocs(q);
  if (!snap.empty) return; // already exists
  await createUser({
    fullName: 'Super Admin',
    username: 'superadmin',
    password: 'admin123',
    role: 'superadmin',
    branchId: null,
    active: true,
  });
  console.log('✅ SuperAdmin seeded: username=superadmin password=admin123');
};
