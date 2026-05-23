// ─── Roles ───────────────────────────────────────────────────────────────────
export type UserRole = 'superadmin' | 'kitchen' | 'menu';

// ─── Firestore user profile (/users/{uid}) ────────────────────────────────────
export interface UserProfile {
  uid: string;
  email: string;
  role: UserRole;
  /** null for superadmin */
  branchId: string | null;
  /** Denormalised for display without an extra fetch */
  branchName: string | null;
  createdAt: Date;
}

/**
 * Legacy username/password profile shape kept for older services that are not
 * part of the Firebase Auth login flow.
 */
export interface AuthUser {
  id: string;
  fullName: string;
  username: string;
  role: UserRole;
  branchId: string | null;
  active: boolean;
}

// ─── Branch document (/branches/{branchId}) ───────────────────────────────────
export interface BranchCredentials {
  email: string;
  password: string;
}

export interface Branch {
  id: string;
  name: string;
  active: boolean;
  kitchenUserId: string | null;
  menuUserId: string | null;
  kitchenCredentials?: BranchCredentials | null;
  menuCredentials?: BranchCredentials | null;
  createdAt: Date;
}
