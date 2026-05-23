/**
 * orderStore.ts
 * ─────────────
 * Thin re-export layer over orderService for backwards-compat with page imports.
 * All functions now require branchId (from auth context).
 */
import { Order } from '@/types/kiosk';
import {
  createOrder,
  getOrderById as _getOrderById,
  getOrders as _getOrders,
  subscribeToOrder,
  subscribeToOrders,
  updateOrderStatus as _updateOrderStatus,
  updatePaymentStatus,
} from '@/services/orderService';

export const getOrders = (branchId: string) => _getOrders(branchId);

export const getOrderById = (branchId: string, orderId: string) =>
  _getOrderById(branchId, orderId);

export const saveOrder = (branchId: string, order: Omit<Order, 'id'>): Promise<Order> =>
  createOrder(branchId, order);

export const updateOrderStatus = (
  branchId: string,
  orderId: string,
  status: Order['status'],
) => _updateOrderStatus(branchId, orderId, status);

export const updateOrderPaymentStatus = (
  branchId: string,
  orderId: string,
  paymentStatus: Order['paymentStatus'],
) => {
  if (!paymentStatus) return Promise.resolve();
  return updatePaymentStatus(branchId, orderId, paymentStatus);
};

export { subscribeToOrder, subscribeToOrders };
