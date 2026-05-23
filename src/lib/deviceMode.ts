/**
 * deviceMode.ts
 * ─────────────
 * Pure localStorage helpers for persisting device mode.
 * No React dependency — usable anywhere in the app.
 */

export type DeviceMode = 'customer' | 'staff';

const KEY = 'aresto-device-mode';

export function getDeviceMode(): DeviceMode | null {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'customer' || v === 'staff') return v;
    return null;
  } catch {
    return null;
  }
}

export function setDeviceMode(mode: DeviceMode): void {
  try {
    localStorage.setItem(KEY, mode);
  } catch {
    /* ignore – e.g. private browsing quota */
  }
}

export function clearDeviceMode(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

/** Routes that customer tablets may NEVER navigate to. */
export const STAFF_ONLY_ROUTES = ['/admin', '/kitchen', '/superadmin', '/login'];

/** Returns true when the given pathname is forbidden for a customer device. */
export function isStaffOnlyRoute(pathname: string): boolean {
  return STAFF_ONLY_ROUTES.some(r => pathname === r || pathname.startsWith(r + '/'));
}
