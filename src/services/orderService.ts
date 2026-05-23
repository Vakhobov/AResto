/**
 * orderService.ts
 * ───────────────
 * Firestore CRUD for orders nested under:
 *   /branches/{branchId}/orders/{orderId}
 *
 * Realtime via onSnapshot — kitchen gets instant updates.
 * Includes retry logic for network resilience and offline support.
 */
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Order, OrderStatus, PaymentStatus } from '@/types/kiosk';
import { normalizeOrderStatus } from '@/lib/orderStatus';
import { removeUndefinedDeep } from '@/lib/firestoreUtils';
import { withRetry, isRetryableError } from '@/lib/retryQueue';
import {
  queueOrderOffline,
  getQueuedOrders,
  removeQueuedOrder,
  incrementSyncAttempt,
} from '@/lib/offlineQueue';
import { getActiveShift, updateShiftOnOrder } from '@/services/shiftService';

// ─── Path helpers ─────────────────────────────────────────────────────────────

const ordersCol = (branchId: string) =>
  collection(db, 'branches', branchId, 'orders');

const orderDocRef = (branchId: string, orderId: string) =>
  doc(db, 'branches', branchId, 'orders', orderId);

// ─── Serialisation ────────────────────────────────────────────────────────────

const toDate = (v: unknown): Date => {
  if (v instanceof Timestamp) return v.toDate();
  if (v instanceof Date) return v;
  if (typeof v === 'string' || typeof v === 'number') return new Date(v);
  return new Date();
};

const normalizePayment = (ps?: PaymentStatus): PaymentStatus => ps ?? 'unpaid';

const fromFirestore = (id: string, data: Record<string, unknown>): Order => {
  const total = Number(data.total ?? 0);
  return {
    id,
    orderNumber: Number(data.orderNumber ?? 0),
    items: (data.items ?? []) as Order['items'],
    subtotal: Number(data.subtotal ?? total),
    serviceFee: Number(data.serviceFee ?? 0),
    total,
    serviceType: (data.serviceType ?? 'self-service') as Order['serviceType'],
    createdAt: toDate(data.createdAt),
    status: normalizeOrderStatus(data.status as OrderStatus | undefined),
    orderType: (data.orderType ?? 'take-out') as Order['orderType'],
    tableNumber: typeof data.tableNumber === 'number' ? data.tableNumber : undefined,
    paymentMethod: data.paymentMethod as Order['paymentMethod'] | undefined,
    paymentStatus: normalizePayment(data.paymentStatus as PaymentStatus | undefined),
    shiftId: data.shiftId ? String(data.shiftId) : undefined,
  };
};

const toFirestore = (order: Omit<Order, 'id'>, now = new Date()) =>
  removeUndefinedDeep({
    orderNumber: order.orderNumber,
    items: order.items,
    subtotal: order.subtotal ?? order.total,
    serviceFee: order.serviceFee ?? 0,
    total: order.total,
    serviceType: order.serviceType ?? 'self-service',
    createdAt: Timestamp.fromDate(order.createdAt ? toDate(order.createdAt) : now),
    updatedAt: Timestamp.fromDate(now),
    status: normalizeOrderStatus(order.status ?? 'new'),
    orderType: order.orderType,
    tableNumber: order.orderType === 'dine-in' ? order.tableNumber : undefined,
    paymentMethod: order.paymentMethod,
    paymentStatus: normalizePayment(order.paymentStatus),
    menuUserId: auth.currentUser?.uid,
    shiftId: order.shiftId,
  });

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export const createOrder = async (
  branchId: string,
  orderData: Omit<Order, 'id'>,
): Promise<Order> => {
  if (!branchId) {
    throw new Error('branchId is required to create an order');
  }

  const activeShift = await getActiveShift(branchId);
  if (!activeShift) {
    throw new Error("Smena ochilmagan. Oshxona hozir buyurtma qabul qilmaydi.");
  }

  const orderWithShift = { ...orderData, shiftId: activeShift.id };
  const data = toFirestore(orderWithShift);
  
  try {
    // Try to create with retry logic for network issues
    const ref = await withRetry(
      () => addDoc(ordersCol(branchId), data),
      { maxAttempts: 3, initialDelayMs: 1000 },
    );
    await updateShiftOnOrder(
      activeShift.id,
      orderData.total,
      orderData.paymentMethod ?? 'cash',
      orderData.items,
    );
    return fromFirestore(ref.id, data);
  } catch (err: any) {
    // If error is network-related, queue offline
    if (isRetryableError(err) || err.message.includes('offline')) {
      console.log('📦 Network offline - queueing order locally');
      const queueId = await queueOrderOffline(branchId, orderWithShift);
      // Return a temporary order with queue ID
      return {
        id: queueId,
        ...orderData,
        createdAt: new Date(),
      };
    }
    // If auth/permission error, throw immediately (don't retry)
    throw err;
  }
};

/**
 * Sync all offline queued orders when network is restored.
 */
export const syncOfflineOrders = async (branchId: string): Promise<void> => {
  const queued = await getQueuedOrders(branchId);
  
  for (const queuedOrder of queued) {
    try {
      await incrementSyncAttempt(queuedOrder.id);
      const ref = await addDoc(ordersCol(branchId), toFirestore(queuedOrder.order));
      const shiftId = queuedOrder.order.shiftId ?? (await getActiveShift(branchId))?.id;
      if (shiftId) {
        await updateShiftOnOrder(
          shiftId,
          queuedOrder.order.total,
          queuedOrder.order.paymentMethod ?? 'cash',
          queuedOrder.order.items,
        );
      }
      console.log('✅ Synced offline order:', ref.id);
      await removeQueuedOrder(queuedOrder.id);
    } catch (err) {
      console.error('❌ Failed to sync offline order:', queuedOrder.id, err);
      if ((err as any).message?.includes('permission-denied')) {
        // Don't retry permission errors - remove from queue
        await removeQueuedOrder(queuedOrder.id);
      }
    }
  }
};

export const getOrderById = async (
  branchId: string,
  orderId: string,
): Promise<Order | null> => {
  const snap = await getDoc(orderDocRef(branchId, orderId));
  if (!snap.exists()) return null;
  return fromFirestore(snap.id, snap.data());
};

export const updateOrderStatus = async (
  branchId: string,
  orderId: string,
  status: OrderStatus,
): Promise<void> => {
  if (!branchId) throw new Error('branchId is required');
  if (!orderId) throw new Error('orderId is required');

  await withRetry(
    () => updateDoc(orderDocRef(branchId, orderId), {
      status: normalizeOrderStatus(status),
      updatedAt: Timestamp.fromDate(new Date()),
    }),
    { maxAttempts: 3, initialDelayMs: 1000 },
  );
};

export const updatePaymentStatus = async (
  branchId: string,
  orderId: string,
  paymentStatus: PaymentStatus,
): Promise<void> => {
  if (!branchId) throw new Error('branchId is required');
  if (!orderId) throw new Error('orderId is required');

  await withRetry(
    () => updateDoc(orderDocRef(branchId, orderId), {
      paymentStatus,
      updatedAt: Timestamp.fromDate(new Date()),
    }),
    { maxAttempts: 3, initialDelayMs: 1000 },
  );
};

// ─── Realtime subscriptions ───────────────────────────────────────────────────

/** Subscribe to all orders for a branch in real time. */
export const subscribeToOrders = (
  branchId: string,
  callback: (orders: Order[]) => void,
  onError?: (err: Error) => void,
) => {
  const q = query(ordersCol(branchId), orderBy('createdAt', 'asc'));
  return onSnapshot(
    q,
    snap => callback(snap.docs.map(d => fromFirestore(d.id, d.data()))),
    err => onError?.(err),
  );
};

/** Subscribe to a single order document for customer order tracking. */
export const subscribeToOrder = (
  branchId: string,
  orderId: string,
  callback: (order: Order | null) => void,
  onError?: (err: Error) => void,
) => {
  return onSnapshot(
    orderDocRef(branchId, orderId),
    snap => callback(snap.exists() ? fromFirestore(snap.id, snap.data()) : null),
    err => onError?.(err),
  );
};

export const getOrders = async (branchId: string): Promise<Order[]> => {
  const snap = await getDocs(query(ordersCol(branchId), orderBy('createdAt', 'asc')));
  return snap.docs.map(d => fromFirestore(d.id, d.data()));
};
