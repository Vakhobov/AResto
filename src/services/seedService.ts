import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  setDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { menuItems, categories } from '@/data/menuData';
import { removeUndefinedFields } from '@/lib/firestoreUtils';

const CATEGORIES_COLLECTION = 'categories';
const FOODS_COLLECTION = 'foods';
const TABLES_COLLECTION = 'tables';

const toFirestoreCategory = (category: typeof categories[number], index: number) =>
  removeUndefinedFields({
    name: category.name,
    icon: category.icon,
    sortOrder: index,
    active: true,
    createdAt: Timestamp.fromDate(new Date()),
    updatedAt: Timestamp.fromDate(new Date()),
  });

const toFirestoreFood = (food: typeof menuItems[number]) =>
  removeUndefinedFields({
    name: food.name,
    description: food.description,
    price: food.price,
    categoryId: food.category,
    categoryName: food.category,
    imageUrl: food.image,
    model3dUrl: food.modelUrl,
    arEnabled: food.hasAR ?? false,
    preparationTime: 10,
    available: food.available ?? true,
    ingredients: food.ingredients,
    createdAt: Timestamp.fromDate(new Date()),
    updatedAt: Timestamp.fromDate(new Date()),
  });

const toFirestoreTable = (number: number) =>
  removeUndefinedFields({
    number,
    status: 'available',
    active: true,
    createdAt: Timestamp.fromDate(new Date()),
    updatedAt: Timestamp.fromDate(new Date()),
  });

export const isCollectionEmpty = async (collectionName: string): Promise<boolean> => {
  const snapshot = await getDocs(collection(db, collectionName));
  return snapshot.empty;
};

export const seedDefaultCategories = async (): Promise<void> => {
  console.log('Seeding default categories...');
  const snapshot = await getDocs(query(collection(db, CATEGORIES_COLLECTION), orderBy('sortOrder', 'asc')));
  const existingIds = new Set(snapshot.docs.map((doc) => doc.id));

  for (const [index, category] of categories.entries()) {
    try {
      const categoryRef = doc(db, CATEGORIES_COLLECTION, category.id);
      const categoryData = toFirestoreCategory(category, index);
      if (existingIds.has(category.id)) {
        await setDoc(categoryRef, categoryData, { merge: true });
      } else {
        await setDoc(categoryRef, categoryData);
      }
      console.log(`Seeded category: ${category.name}`);
    } catch (error) {
      console.error(`Failed to seed category ${category.name}:`, error);
    }
  }
};

export const seedDefaultFoods = async (): Promise<void> => {
  console.log('Seeding default foods...');
  const snapshot = await getDocs(collection(db, FOODS_COLLECTION));
  const existingIds = new Set(snapshot.docs.map((doc) => doc.id));

  for (const food of menuItems) {
    try {
      const foodRef = doc(db, FOODS_COLLECTION, food.id);
      const foodData = toFirestoreFood(food);
      if (existingIds.has(food.id)) {
        await setDoc(foodRef, { ...foodData, updatedAt: Timestamp.fromDate(new Date()) }, { merge: true });
      } else {
        await setDoc(foodRef, foodData);
      }
      console.log(`Seeded food: ${food.name}`);
    } catch (error) {
      console.error(`Failed to seed food ${food.name}:`, error);
    }
  }
};

export const seedDefaultTables = async (): Promise<void> => {
  console.log('Seeding default tables...');
  const snapshot = await getDocs(query(collection(db, TABLES_COLLECTION), orderBy('number', 'asc')));
  const existingNumbers = new Set(snapshot.docs.map((tableDoc) => Number(tableDoc.data()?.number ?? 0)));

  for (let i = 1; i <= 20; i++) {
    if (existingNumbers.has(i)) continue;
    try {
      const tableRef = doc(db, TABLES_COLLECTION, `table-${i}`);
      await setDoc(tableRef, toFirestoreTable(i));
      console.log(`Seeded table: ${i}`);
    } catch (error) {
      console.error(`Failed to seed table ${i}:`, error);
    }
  }
};

export const seedAllDefaultData = async (): Promise<void> => {
  console.log('Starting seed process...');
  await seedDefaultCategories();
  await seedDefaultFoods();
  await seedDefaultTables();
  console.log('Seed process completed!');
};

export const seedBranchDefaultData = async (branchId: string): Promise<void> => {
  console.log('Starting branch seed process...', branchId);
  const now = Timestamp.fromDate(new Date());

  for (const [index, category] of categories.entries()) {
    const categoryRef = doc(db, 'branches', branchId, CATEGORIES_COLLECTION, category.id);
    await setDoc(categoryRef, {
      ...toFirestoreCategory(category, index),
      createdAt: now,
      updatedAt: now,
    }, { merge: true });
  }

  for (const food of menuItems) {
    const foodRef = doc(db, 'branches', branchId, FOODS_COLLECTION, food.id);
    await setDoc(foodRef, {
      ...toFirestoreFood(food),
      createdAt: now,
      updatedAt: now,
    }, { merge: true });
  }

  for (let i = 1; i <= 20; i++) {
    const tableRef = doc(db, 'branches', branchId, TABLES_COLLECTION, `table-${i}`);
    await setDoc(tableRef, {
      ...toFirestoreTable(i),
      createdAt: now,
      updatedAt: now,
    }, { merge: true });
  }

  console.log('Branch seed process completed!', branchId);
};

// Manual seed function - call this in browser console or from a dev page
// Example: import { seedAllDefaultData } from '@/services/seedService'; seedAllDefaultData();
export const manualSeed = seedAllDefaultData;
