/**
 * branchService.ts
 * ────────────────
 * Firestore CRUD for the /branches top-level collection.
 * Branches themselves are NOT nested — they are the root of all nested data.
 */
import {
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  updateDoc,
  deleteDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Branch } from '@/types/auth';
import { removeUndefinedFields } from '@/lib/firestoreUtils';
import { seedBranchDefaultData } from '@/services/seedService';

const BRANCHES = 'branches';

const toDate = (v: unknown): Date => {
  if (v instanceof Timestamp) return v.toDate();
  if (v instanceof Date) return v;
  return new Date();
};

const fromFirestore = (id: string, data: Record<string, unknown>): Branch => ({
  id,
  name: String(data.name ?? ''),
  active: Boolean(data.active ?? true),
  kitchenUserId: data.kitchenUserId ? String(data.kitchenUserId) : null,
  menuUserId: data.menuUserId ? String(data.menuUserId) : null,
  kitchenCredentials: data.kitchenCredentials ? {
    email: String((data.kitchenCredentials as Record<string, unknown>).email ?? ''),
    password: String((data.kitchenCredentials as Record<string, unknown>).password ?? ''),
  } : null,
  menuCredentials: data.menuCredentials ? {
    email: String((data.menuCredentials as Record<string, unknown>).email ?? ''),
    password: String((data.menuCredentials as Record<string, unknown>).password ?? ''),
  } : null,
  createdAt: toDate(data.createdAt),
});

export type BranchInput = {
  name: string;
  active?: boolean;
  kitchenUserId?: string | null;
  menuUserId?: string | null;
  kitchenCredentials?: { email: string; password: string } | null;
  menuCredentials?: { email: string; password: string } | null;
};

export const createBranch = async (data: BranchInput): Promise<Branch> => {
  const now = Timestamp.fromDate(new Date());
  const docData = removeUndefinedFields({
    name: data.name,
    active: data.active ?? true,
    kitchenUserId: data.kitchenUserId ?? null,
    menuUserId: data.menuUserId ?? null,
    kitchenCredentials: data.kitchenCredentials ?? null,
    menuCredentials: data.menuCredentials ?? null,
    createdAt: now,
  });
  const ref = await addDoc(collection(db, BRANCHES), docData);
  try {
    await seedBranchDefaultData(ref.id);
  } catch (error) {
    console.error('Failed to seed default branch data:', error);
  }
  return fromFirestore(ref.id, { ...docData, createdAt: now });
};

export const updateBranch = async (
  branchId: string,
  data: Partial<BranchInput>,
): Promise<void> => {
  await updateDoc(
    doc(db, BRANCHES, branchId),
    removeUndefinedFields({
      ...(data.name                !== undefined && { name: data.name }),
      ...(data.active              !== undefined && { active: data.active }),
      ...(data.kitchenUserId       !== undefined && { kitchenUserId: data.kitchenUserId }),
      ...(data.menuUserId          !== undefined && { menuUserId: data.menuUserId }),
      ...(data.kitchenCredentials   !== undefined && { kitchenCredentials: data.kitchenCredentials }),
      ...(data.menuCredentials      !== undefined && { menuCredentials: data.menuCredentials }),
    }),
  );
};

export const getBranches = async (): Promise<Branch[]> => {
  const snap = await getDocs(query(collection(db, BRANCHES), orderBy('createdAt', 'asc')));
  return snap.docs.map(d => fromFirestore(d.id, d.data()));
};

export const subscribeToBranches = (
  callback: (branches: Branch[]) => void,
  onError?: (err: Error) => void,
) => {
  const q = query(collection(db, BRANCHES), orderBy('createdAt', 'asc'));
  return onSnapshot(
    q,
    snap => callback(snap.docs.map(d => fromFirestore(d.id, d.data()))),
    err => onError?.(err),
  );
};

const SUBCOLLECTIONS_TO_REMOVE = ['orders', 'categories', 'foods', 'tables'];

const chunk = <T,>(arr: T[], size: number) => {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

const deleteCollectionDocsBatched = async (branchId: string, subcol: string) => {
  const snap = await getDocs(collection(db, BRANCHES, branchId, subcol));
  if (snap.empty) return;
  const docs = snap.docs.map(d => d.ref);
  const batches = chunk(docs, 500);
  for (const batchDocs of batches) {
    const b = writeBatch(db);
    batchDocs.forEach(dref => b.delete(dref));
    await b.commit();
  }
};

export const deleteBranch = async (branchId: string): Promise<void> => {
  // Delete known subcollections first in batches to avoid orphaned data.
  for (const sub of SUBCOLLECTIONS_TO_REMOVE) {
    try {
      await deleteCollectionDocsBatched(branchId, sub);
    } catch (err) {
      console.warn(`Failed to delete subcollection ${sub} for branch ${branchId}:`, err);
    }
  }

  // Finally remove the branch document itself
  await deleteDoc(doc(db, BRANCHES, branchId));
};
