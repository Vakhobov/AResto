/**
 * tableService.ts
 * ───────────────
 * Firestore CRUD for restaurant tables nested under:
 *   /branches/{branchId}/tables/{tableId}
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
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { removeUndefinedFields } from '@/lib/firestoreUtils';

export type TableStatus = 'available' | 'occupied' | 'reserved' | 'inactive';

export interface RestaurantTable {
  id: string;
  number: number;
  name?: string;
  status: TableStatus;
  currentOrderId?: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

type TableInput = Omit<RestaurantTable, 'id' | 'createdAt' | 'updatedAt'>;

// ─── Path helpers ─────────────────────────────────────────────────────────────

const tablesCol = (branchId: string) =>
  collection(db, 'branches', branchId, 'tables');

const tableDocRef = (branchId: string, tableId: string) =>
  doc(db, 'branches', branchId, 'tables', tableId);

// ─── Serialisation ────────────────────────────────────────────────────────────

const toDate = (v: unknown): Date => {
  if (v instanceof Timestamp) return v.toDate();
  if (v instanceof Date) return v;
  return new Date();
};

const fromFirestore = (id: string, data: Record<string, unknown>): RestaurantTable => ({
  id,
  number: Number(data.number ?? 0),
  name: data.name ? String(data.name) : undefined,
  status: (data.status as TableStatus) ?? 'available',
  currentOrderId: data.currentOrderId ? String(data.currentOrderId) : undefined,
  active: Boolean(data.active ?? true),
  createdAt: toDate(data.createdAt),
  updatedAt: toDate(data.updatedAt),
});

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export const createTable = async (
  branchId: string,
  tableData: TableInput,
): Promise<RestaurantTable> => {
  const now = Timestamp.fromDate(new Date());
  const data = removeUndefinedFields({
    number: tableData.number,
    name: tableData.name,
    status: tableData.status ?? 'available',
    currentOrderId: tableData.currentOrderId,
    active: tableData.active ?? true,
    createdAt: now,
    updatedAt: now,
  });
  const ref = await addDoc(tablesCol(branchId), data);
  return fromFirestore(ref.id, data);
};

export const updateTable = async (
  branchId: string,
  tableId: string,
  tableData: Partial<TableInput>,
): Promise<void> => {
  const update = removeUndefinedFields({
    ...(tableData.number         !== undefined && { number: tableData.number }),
    ...(tableData.name           !== undefined && { name: tableData.name }),
    ...(tableData.status         !== undefined && { status: tableData.status }),
    ...(tableData.currentOrderId !== undefined && { currentOrderId: tableData.currentOrderId }),
    ...(tableData.active         !== undefined && { active: tableData.active }),
    updatedAt: Timestamp.fromDate(new Date()),
  });
  await updateDoc(tableDocRef(branchId, tableId), update);
};

export const deleteTable = async (branchId: string, tableId: string): Promise<void> => {
  await deleteDoc(tableDocRef(branchId, tableId));
};

export const subscribeToTables = (
  branchId: string,
  callback: (tables: RestaurantTable[]) => void,
  onError?: (err: Error) => void,
) => {
  const q = query(tablesCol(branchId), orderBy('number', 'asc'));
  return onSnapshot(
    q,
    snap => callback(snap.docs.map(d => fromFirestore(d.id, d.data()))),
    err => onError?.(err),
  );
};

export const getTables = async (branchId: string): Promise<RestaurantTable[]> => {
  const snap = await getDocs(query(tablesCol(branchId), orderBy('number', 'asc')));
  return snap.docs.map(d => fromFirestore(d.id, d.data()));
};

// ─── Table lookup by number ───────────────────────────────────────────────────

const getTableByNumber = async (
  branchId: string,
  tableNumber: number,
): Promise<RestaurantTable | null> => {
  const snap = await getDocs(
    query(tablesCol(branchId), where('number', '==', tableNumber)),
  );
  if (snap.empty) return null;
  return fromFirestore(snap.docs[0].id, snap.docs[0].data());
};

export const markTableOccupied = async (
  branchId: string,
  tableNumber: number,
  orderId: string,
): Promise<void> => {
  const table = await getTableByNumber(branchId, tableNumber);
  if (table) await updateTable(branchId, table.id, { status: 'occupied', currentOrderId: orderId });
};

export const markTableAvailable = async (
  branchId: string,
  tableNumber: number,
): Promise<void> => {
  const table = await getTableByNumber(branchId, tableNumber);
  if (table) await updateTable(branchId, table.id, { status: 'available', currentOrderId: undefined });
};