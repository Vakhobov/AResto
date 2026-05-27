/**
 * userProfileService.ts  — Supabase
 * ─────────────────────────────────
 * User profile CRUD via Supabase `profiles` table.
 * User creation delegates to /api/admin-users (Vercel function) so the
 * service-role key stays server-side only.
 */
import { supabase } from '@/lib/supabase';
import { UserProfile, UserRole } from '@/types/auth';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const rowToProfile = (row: any): UserProfile => ({
  uid: row.id,
  email: row.email,
  role: row.role as UserRole,
  branchId: row.branch_id ?? null,
  branchName: row.branch_name ?? null,
  createdAt: new Date(row.created_at),
});

// ─── Public API ───────────────────────────────────────────────────────────────

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, role, branch_id, branch_name, created_at')
    .eq('id', uid)
    .maybeSingle();

  if (error) throw error;
  return data ? rowToProfile(data) : null;
};

export const setUserProfile = async (
  profile: Omit<UserProfile, 'createdAt'>,
): Promise<void> => {
  const { error } = await supabase.from('profiles').upsert({
    id: profile.uid,
    email: profile.email,
    role: profile.role,
    branch_id: profile.branchId ?? null,
    branch_name: profile.branchName ?? null,
  });
  if (error) throw error;
};

/**
 * Calls the /api/admin-users Vercel function to create a Firebase/Supabase Auth
 * user + profile row.  The service-role key lives only on the server.
 */
export const createFirebaseUser = async (
  email: string,
  password: string,
  role: UserRole,
  branchId: string | null,
  branchName: string | null,
): Promise<string> => {
  // Get the current session token to authenticate as superadmin
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token ?? '';

  const res = await fetch('/api/admin-users', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ action: 'create', email, password, role, branchId, branchName }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error ?? `HTTP ${res.status}`);
  }

  let result;
  try {
    result = await res.json();
  } catch (e) {
    throw new Error(`Tarmoq xatosi (HTTP ${res.status}). Iltimos, API serverni tekshiring (npm run dev:full).`);
  }
  return result.uid as string;
};

/**
 * Seeds the superadmin account via the /api/admin-users endpoint.
 * Safe to call multiple times — skips if already exists.
 */
/**
 * Updates email+password for an existing user via the /api/admin-users endpoint.
 */
export const updateFirebaseUserCredentials = async (
  currentEmail: string,
  newEmail: string,
  newPassword: string,
): Promise<string> => {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token ?? '';

  const res = await fetch('/api/admin-users', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ action: 'updateCredentials', currentEmail, newEmail, newPassword }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error ?? `HTTP ${res.status}`);
  }

  let result;
  try {
    result = await res.json();
  } catch (e) {
    throw new Error(`Tarmoq xatosi (HTTP ${res.status}). Iltimos, API serverni tekshiring (npm run dev:full).`);
  }
  return result.uid as string;
};

export const seedSuperAdmin = async (): Promise<void> => {
  const res = await fetch('/api/admin-users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'seedSuperAdmin',
      email: 'superadmin@aresto.com',
      password: 'Admin1234!',
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error ?? `HTTP ${res.status}`);
  }
};
