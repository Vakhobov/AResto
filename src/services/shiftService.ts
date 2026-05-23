/**
 * shiftService.ts  (full rewrite)
 * ─────────────────────────────────
 * Firestore CRUD for the `shifts` collection with complete summary tracking.
 * Branch-isolated: all queries scoped by branchId unless null (SuperAdmin).
 */
import {
  addDoc,
  collection,
  doc,
  getDocs,
  increment,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  updateDoc,
  where,
  limit,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { removeUndefinedFields } from '@/lib/firestoreUtils';
import { CartItem } from '@/types/kiosk';

const SHIFTS = 'shifts';

export type ShiftStatus = 'open' | 'closed';

/** Per-payment-method revenue breakdown stored in the shift doc. */
export interface PaymentSummary {
  cash: number;
  card: number;
  nfc: number;
  click: number;
  payme: number;
  uzum: number;
  [key: string]: number;
}

/** Per-food-item quantity sold, keyed by item name. */
export interface SoldItemsSummary {
  [itemName: string]: number;
}

export interface Shift {
  id: string;
  branchId: string;
  openedBy: string;       // user fullName or id
  closedBy?: string;
  status: ShiftStatus;
  openedAt: Date;
  closedAt?: Date;
  notes?: string;
  totalOrders: number;
  totalRevenue: number;
  paymentSummary: PaymentSummary;
  soldItemsSummary: SoldItemsSummary;
}

/* ─── helpers ─────────────────────────────────────────── */

const toDate = (value: unknown): Date => {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  if (typeof value === 'string' || typeof value === 'number') return new Date(value);
  return new Date();
};

const emptyPaymentSummary = (): PaymentSummary => ({
  cash: 0, card: 0, nfc: 0, click: 0, payme: 0, uzum: 0,
});

const fromFirestoreShift = (id: string, data: Record<string, unknown>): Shift => ({
  id,
  branchId: String(data.branchId ?? ''),
  openedBy: String(data.openedBy ?? ''),
  closedBy: data.closedBy ? String(data.closedBy) : undefined,
  status: (data.status as ShiftStatus) ?? 'open',
  openedAt: toDate(data.openedAt),
  closedAt: data.closedAt ? toDate(data.closedAt) : undefined,
  notes: data.notes ? String(data.notes) : undefined,
  totalOrders: Number(data.totalOrders ?? 0),
  totalRevenue: Number(data.totalRevenue ?? 0),
  paymentSummary: (data.paymentSummary as PaymentSummary) ?? emptyPaymentSummary(),
  soldItemsSummary: (data.soldItemsSummary as SoldItemsSummary) ?? {},
});

/* ─── open shift ───────────────────────────────────────── */

export interface OpenShiftInput {
  branchId: string;
  openedBy: string;
  notes?: string;
}

export const openShift = async (input: OpenShiftInput): Promise<Shift> => {
  // Guard: don't allow two open shifts for the same branch
  const existing = await getActiveShift(input.branchId);
  if (existing) throw new Error('Bu filial uchun allaqachon ochiq smena mavjud');

  const now = Timestamp.fromDate(new Date());
  const data = removeUndefinedFields({
    branchId: input.branchId,
    openedBy: input.openedBy,
    status: 'open' as ShiftStatus,
    openedAt: now,
    totalOrders: 0,
    totalRevenue: 0,
    paymentSummary: emptyPaymentSummary(),
    soldItemsSummary: {},
    ...(input.notes ? { notes: input.notes } : {}),
  });

  const docRef = await addDoc(collection(db, SHIFTS), data);
  return fromFirestoreShift(docRef.id, { ...data, openedAt: now });
};

/* ─── close shift ──────────────────────────────────────── */

export const closeShift = async (
  shiftId: string,
  closedBy: string,
  notes?: string,
): Promise<void> => {
  await updateDoc(doc(db, SHIFTS, shiftId), removeUndefinedFields({
    status: 'closed' as ShiftStatus,
    closedBy,
    closedAt: Timestamp.fromDate(new Date()),
    ...(notes !== undefined ? { notes } : {}),
  }));
};

/* ─── update shift totals on order ────────────────────── */

/**
 * Called after every successful paid order to update shift aggregates.
 * Uses Firestore `increment()` for atomic, race-safe updates.
 */
export const updateShiftOnOrder = async (
  shiftId: string,
  orderTotal: number,
  paymentMethod: string,
  items: CartItem[],
): Promise<void> => {
  // Build soldItems increments: { 'soldItemsSummary.Burger': increment(2) }
  const soldIncrements: Record<string, ReturnType<typeof increment>> = {};
  for (const item of items) {
    const safeName = item.name.replace(/[.[\]*/~]/g, '_');
    const key = `soldItemsSummary.${safeName}`;
    soldIncrements[key] = increment(item.quantity);
  }

  const paymentKey = `paymentSummary.${paymentMethod}`;

  await updateDoc(doc(db, SHIFTS, shiftId), {
    totalOrders: increment(1),
    totalRevenue: increment(orderTotal),
    [paymentKey]: increment(orderTotal),
    ...soldIncrements,
  });
};

/* ─── queries ──────────────────────────────────────────── */

/**
 * Get the currently open shift for a branch (one-time fetch).
 * Returns null if no open shift exists.
 */
export const getActiveShift = async (branchId: string): Promise<Shift | null> => {
  const q = query(
    collection(db, SHIFTS),
    where('branchId', '==', branchId),
    where('status', '==', 'open'),
    limit(1),
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return fromFirestoreShift(d.id, d.data());
};

/**
 * Realtime subscription to the active shift for a branch.
 * Fires immediately and on every update to the open shift document.
 * Returns unsubscribe function.
 */
export const subscribeToActiveShift = (
  branchId: string | null,
  callback: (shift: Shift | null) => void,
  onError?: (err: Error) => void,
) => {
  if (!branchId) {
    // SuperAdmin: subscribe to all open shifts (returns latest)
    const q = query(
      collection(db, SHIFTS),
      where('status', '==', 'open'),
      orderBy('openedAt', 'desc'),
      limit(1),
    );
    return onSnapshot(
      q,
      snap => callback(snap.empty ? null : fromFirestoreShift(snap.docs[0].id, snap.docs[0].data())),
      err => onError?.(err),
    );
  }

  const q = query(
    collection(db, SHIFTS),
    where('branchId', '==', branchId),
    where('status', '==', 'open'),
    limit(1),
  );
  return onSnapshot(
    q,
    snap => callback(snap.empty ? null : fromFirestoreShift(snap.docs[0].id, snap.docs[0].data())),
    err => onError?.(err),
  );
};

/**
 * Subscribe to ALL shifts (history) for a branch.
 */
export const subscribeToShifts = (
  branchId: string | null,
  callback: (shifts: Shift[]) => void,
  onError?: (error: Error) => void,
) => {
  const q = branchId
    ? query(
        collection(db, SHIFTS),
        where('branchId', '==', branchId),
        orderBy('openedAt', 'desc'),
      )
    : query(collection(db, SHIFTS), orderBy('openedAt', 'desc'));

  return onSnapshot(
    q,
    snap => callback(snap.docs.map(d => fromFirestoreShift(d.id, d.data()))),
    err => onError?.(err),
  );
};

export const getShifts = async (branchId: string | null): Promise<Shift[]> => {
  const q = branchId
    ? query(collection(db, SHIFTS), where('branchId', '==', branchId), orderBy('openedAt', 'desc'))
    : query(collection(db, SHIFTS), orderBy('openedAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => fromFirestoreShift(d.id, d.data()));
};
