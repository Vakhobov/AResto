/**
 * foodService.ts
 * ──────────────
 * Firestore CRUD for foods nested under:
 *   /branches/{branchId}/foods/{foodId}
 *
 * branchId is always required — comes from userProfile.branchId via AuthContext.
 * Includes input validation and retry logic.
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
import { MenuItem } from '@/types/kiosk';
import { removeUndefinedFields } from '@/lib/firestoreUtils';
import { withRetry } from '@/lib/retryQueue';

// ─── Input validation ─────────────────────────────────────────────────────────

function validateFoodInput(food: Omit<MenuItem, 'id'>): void {
  if (!food.name || food.name.trim().length === 0) {
    throw new Error('Taom nomi majburiy');
  }
  if (food.name.length > 100) {
    throw new Error('Taom nomi 100 ta belgidan ko\'p bo\'lmasligi kerak');
  }
  if (typeof food.price !== 'number' || food.price < 0) {
    throw new Error('Narx musbat son bo\'lishi kerak');
  }
  if (food.price > 999999) {
    throw new Error('Narx haddan tashqari katta');
  }
  if (!food.category || food.category.trim().length === 0) {
    throw new Error('Kategoriya majburiy');
  }
}

// ─── Path helper ──────────────────────────────────────────────────────────────

const foodsCol = (branchId: string) =>
  collection(db, 'branches', branchId, 'foods');

const foodDoc = (branchId: string, foodId: string) =>
  doc(db, 'branches', branchId, 'foods', foodId);

// ─── Serialisation ────────────────────────────────────────────────────────────

const fromFirestore = (id: string, data: Record<string, unknown>): MenuItem => ({
  id,
  name: String(data.name ?? ''),
  description: data.description ? String(data.description) : undefined,
  price: Number(data.price ?? 0),
  image: String(data.imageUrl ?? ''),
  category: String(data.categoryId ?? ''),
  modelUrl: data.model3dUrl ? String(data.model3dUrl) : undefined,
  hasAR: Boolean(data.arEnabled ?? false),
  available: Boolean(data.available ?? true),
  ingredients: Array.isArray(data.ingredients) ? data.ingredients.map(String) : undefined,
});

const toFirestore = (food: Omit<MenuItem, 'id'>, now = new Date()) =>
  removeUndefinedFields({
    name: food.name.trim(),
    description: food.description?.trim(),
    price: food.price,
    categoryId: food.category.trim(),
    imageUrl: food.image,
    model3dUrl: food.modelUrl,
    arEnabled: food.hasAR ?? false,
    available: food.available ?? true,
    ingredients: food.ingredients,
    createdAt: Timestamp.fromDate(now),
    updatedAt: Timestamp.fromDate(now),
  });

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export const createFood = async (
  branchId: string,
  foodData: Omit<MenuItem, 'id'>,
): Promise<MenuItem> => {
  if (!branchId) throw new Error('branchId majburiy');
  
  validateFoodInput(foodData);
  const data = toFirestore(foodData);
  
  const ref = await withRetry(
    () => addDoc(foodsCol(branchId), data),
    { maxAttempts: 3 }
  );
  return fromFirestore(ref.id, data);
};

export const updateFood = async (
  branchId: string,
  foodId: string,
  foodData: Partial<Omit<MenuItem, 'id'>>,
): Promise<void> => {
  if (!branchId) throw new Error('branchId majburiy');
  if (!foodId) throw new Error('foodId majburiy');
  
  // Validate only provided fields
  if (foodData.name !== undefined && foodData.name.length > 0) {
    if (foodData.name.trim().length === 0) throw new Error('Taom nomi bo\'sh bo\'lmasligi kerak');
  }
  if (foodData.price !== undefined) {
    if (foodData.price < 0) throw new Error('Narx manfiy bo\'lmasligi kerak');
  }

  const update = removeUndefinedFields({
    ...(foodData.name        !== undefined && { name: foodData.name.trim() }),
    ...(foodData.description !== undefined && { description: foodData.description?.trim() }),
    ...(foodData.price       !== undefined && { price: foodData.price }),
    ...(foodData.category    !== undefined && { categoryId: foodData.category.trim() }),
    ...(foodData.image       !== undefined && { imageUrl: foodData.image }),
    ...(foodData.modelUrl    !== undefined && { model3dUrl: foodData.modelUrl }),
    ...(foodData.hasAR       !== undefined && { arEnabled: foodData.hasAR }),
    ...(foodData.available   !== undefined && { available: foodData.available }),
    ...(foodData.ingredients !== undefined && { ingredients: foodData.ingredients }),
    updatedAt: Timestamp.fromDate(new Date()),
  });

  await withRetry(
    () => updateDoc(foodDoc(branchId, foodId), update),
    { maxAttempts: 3 }
  );
};

export const deleteFood = async (branchId: string, foodId: string): Promise<void> => {
  if (!branchId) throw new Error('branchId majburiy');
  if (!foodId) throw new Error('foodId majburiy');

  await withRetry(
    () => deleteDoc(foodDoc(branchId, foodId)),
    { maxAttempts: 3 }
  );
};

// ─── Realtime subscription ────────────────────────────────────────────────────

export const subscribeToFoods = (
  branchId: string,
  callback: (foods: MenuItem[]) => void,
  onError?: (err: Error) => void,
) => {
  const q = query(foodsCol(branchId), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    snap => callback(snap.docs.map(d => fromFirestore(d.id, d.data()))),
    err => onError?.(err),
  );
};

export const getFoods = async (branchId: string): Promise<MenuItem[]> => {
  const snap = await getDocs(query(foodsCol(branchId), orderBy('createdAt', 'desc')));
  return snap.docs.map(d => fromFirestore(d.id, d.data()));
};