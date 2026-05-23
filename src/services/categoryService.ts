/**
 * categoryService.ts
 * ──────────────────
 * Firestore CRUD for categories nested under:
 *   /branches/{branchId}/categories/{categoryId}
 */
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { removeUndefinedFields } from '@/lib/firestoreUtils';

export interface Category {
  id: string;
  name: string;
  icon: string;
  sortOrder?: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

type CategoryInput = Omit<Category, 'id' | 'createdAt' | 'updatedAt'>;

// ─── Path helpers ─────────────────────────────────────────────────────────────

const catsCol = (branchId: string) =>
  collection(db, 'branches', branchId, 'categories');

const catDoc = (branchId: string, catId: string) =>
  doc(db, 'branches', branchId, 'categories', catId);

// ─── Serialisation ────────────────────────────────────────────────────────────

const toDate = (v: unknown): Date => {
  if (v instanceof Timestamp) return v.toDate();
  if (v instanceof Date) return v;
  return new Date();
};

const fromFirestore = (id: string, data: Record<string, unknown>): Category => ({
  id,
  name: String(data.name ?? ''),
  icon: String(data.icon ?? ''),
  sortOrder: data.sortOrder != null ? Number(data.sortOrder) : undefined,
  active: Boolean(data.active ?? true),
  createdAt: toDate(data.createdAt),
  updatedAt: toDate(data.updatedAt),
});

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export const createCategory = async (
  branchId: string,
  data: CategoryInput,
): Promise<Category> => {
  const now = Timestamp.fromDate(new Date());
  const doc_data = removeUndefinedFields({
    name: data.name,
    icon: data.icon,
    sortOrder: data.sortOrder ?? 0,
    active: data.active ?? true,
    createdAt: now,
    updatedAt: now,
  });
  const ref = await addDoc(catsCol(branchId), doc_data);
  return fromFirestore(ref.id, { ...doc_data, createdAt: now, updatedAt: now });
};

export const updateCategory = async (
  branchId: string,
  categoryId: string,
  data: Partial<CategoryInput>,
): Promise<void> => {
  const update = removeUndefinedFields({
    ...(data.name      !== undefined && { name: data.name }),
    ...(data.icon      !== undefined && { icon: data.icon }),
    ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
    ...(data.active    !== undefined && { active: data.active }),
    updatedAt: Timestamp.fromDate(new Date()),
  });
  await updateDoc(catDoc(branchId, categoryId), update);
};

export const deleteCategory = async (branchId: string, categoryId: string): Promise<void> => {
  await deleteDoc(catDoc(branchId, categoryId));
};

// ─── Realtime subscription ────────────────────────────────────────────────────

export const subscribeToCategories = (
  branchId: string,
  callback: (cats: Category[]) => void,
  onError?: (err: Error) => void,
) => {
  const q = query(catsCol(branchId), orderBy('sortOrder', 'asc'));
  return onSnapshot(
    q,
    snap => callback(snap.docs.map(d => fromFirestore(d.id, d.data()))),
    err => onError?.(err),
  );
};

export const getCategories = async (branchId: string): Promise<Category[]> => {
  const snap = await getDocs(query(catsCol(branchId), orderBy('sortOrder', 'asc')));
  return snap.docs.map(d => fromFirestore(d.id, d.data()));
};