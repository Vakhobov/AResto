/**
 * AuthContext.tsx  — Supabase Auth (optimised)
 * ──────────────────────────────────────────────
 * Single auth flow: onAuthStateChange handles INITIAL_SESSION,
 * so we don't call getSession() separately (avoids double profile fetch).
 */
import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { UserProfile, UserRole } from '@/types/auth';

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  session: Session | null;
  login: (email: string, password: string) => Promise<UserProfile>;
  logout: () => Promise<void>;
  loading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

const fetchProfile = async (uid: string): Promise<UserProfile | null> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, role, branch_id, branch_name, created_at')
    .eq('id', uid)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    uid: data.id,
    email: data.email,
    role: data.role as UserRole,
    branchId: data.branch_id ?? null,
    branchName: data.branch_name ?? null,
    createdAt: new Date(data.created_at),
  };
};

const applyProfile = (
  profile: UserProfile | null,
  setProfile: (p: UserProfile | null) => void,
  setError: (e: string | null) => void,
) => {
  if (profile && profile.role !== 'superadmin' && !profile.branchId) {
    setError("Foydalanuvchi filialga bog'lanmagan. Admin bilan bog'laning.");
    setProfile(null);
  } else {
    setProfile(profile);
    setError(null);
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [session, setSession]         = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);

  // Prevent double-fetch when login() already set the profile
  const skipNextAuthChange = useRef(false);

  useEffect(() => {
    let mounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, s) => {
        if (!mounted) return;
        
        setSession(s);
        setCurrentUser(s?.user ?? null);

        if (!s?.user) {
          setUserProfile(null);
          setError(null);
          setLoading(false);
          return;
        }

        if (skipNextAuthChange.current) {
          skipNextAuthChange.current = false;
          setLoading(false);
          return;
        }

        // Defer the profile fetching to the next event loop tick to prevent re-entrant lock deadlocks.
        // During auth events (e.g. sign-in, refresh), the Supabase Auth client holds an internal session lock.
        // Querying the DB (like profiles table) inside this callback tries to acquire the same lock, deadlocking it.
        setTimeout(async () => {
          if (!mounted) return;
          try {
            const profile = await fetchProfile(s.user.id);
            if (mounted) applyProfile(profile, setUserProfile, setError);
          } catch (e) {
            console.error('Profile fetch error:', e);
            if (mounted) {
              setError('Profil yuklanmadi.');
              setUserProfile(null);
            }
          } finally {
            if (mounted) setLoading(false);
          }
        }, 0);
      },
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string): Promise<UserProfile> => {
    console.log('[AuthContext] login called with email:', email);
    setError(null);

    console.log('[AuthContext] calling supabase.auth.signInWithPassword...');
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    console.log('[AuthContext] signInWithPassword result:', { data, signInError });

    if (signInError) throw signInError;
    if (!data.user) throw new Error('Kirish amalga oshmadi.');

    console.log('[AuthContext] calling fetchProfile for uid:', data.user.id);
    const profile = await fetchProfile(data.user.id);
    console.log('[AuthContext] fetchProfile result:', profile);
    
    if (!profile) throw new Error("Foydalanuvchi profili topilmadi. Admin bilan bog'laning.");
    if (profile.role !== 'superadmin' && !profile.branchId) {
      throw new Error("Foydalanuvchi filialga bog'lanmagan. Admin bilan bog'laning.");
    }

    // We already have the profile — tell the auth change listener to skip
    skipNextAuthChange.current = true;
    setCurrentUser(data.user);
    setSession(data.session);
    setUserProfile(profile);
    console.log('[AuthContext] login successful, returning profile');
    return profile;
  };

  const logout = async (): Promise<void> => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setSession(null);
    setUserProfile(null);
    setError(null);
  };

  return (
    <AuthContext.Provider value={{ currentUser, userProfile, session, loading, login, logout, error }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};
