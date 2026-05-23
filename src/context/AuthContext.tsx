/**
 * AuthContext.tsx
 * ───────────────
 * Firebase Auth–based authentication context.
 *
 * Flow:
 *  1. onAuthStateChanged fires on mount (and on every login/logout)
 *  2. If user exists → fetch /users/{uid} from Firestore to get role + branchId
 *  3. Validate branchId is present (except for superadmin)
 *  4. Expose currentUser (Firebase User) + userProfile + login + logout + loading
 */
import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { getUserProfile } from '@/services/userProfileService';
import { UserProfile } from '@/types/auth';

// ─── Context shape ────────────────────────────────────────────────────────────

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  login: (email: string, password: string) => Promise<UserProfile>;
  logout: () => Promise<void>;
  loading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser]   = useState<User | null>(null);
  const [userProfile, setUserProfile]   = useState<UserProfile | null>(null);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setCurrentUser(firebaseUser);
      setError(null);

      if (firebaseUser) {
        try {
          const profile = await getUserProfile(firebaseUser.uid);
          
          // Validate branchId for non-superadmin users
          if (profile && profile.role !== 'superadmin' && !profile.branchId) {
            console.error('❌ User missing branchId:', firebaseUser.uid);
            setError('Foydalanuvchi filialga bog\'lanmagan. Admin bilan bog\'laning.');
            setUserProfile(null);
            return;
          }

          setUserProfile(profile);
        } catch (err) {
          console.error('Failed to load user profile:', err);
          setError('Profil yuklanmadi. Admin bilan bog\'laning.');
          setUserProfile(null);
        }
      } else {
        setUserProfile(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async (email: string, password: string): Promise<UserProfile> => {
    if (!email.trim() || !password.trim()) {
      throw new Error('Email va parol majburiy');
    }

    const credential = await signInWithEmailAndPassword(auth, email, password);
    const profile = await getUserProfile(credential.user.uid);
    
    if (!profile) {
      throw new Error('Foydalanuvchi profili topilmadi. Admin bilan bog\'laning.');
    }

    // Validate branchId for non-superadmin
    if (profile.role !== 'superadmin' && !profile.branchId) {
      throw new Error('Foydalanuvchi filialga bog\'lanmagan. Admin bilan bog\'laning.');
    }

    // onAuthStateChanged will fire and set state automatically,
    // but we also set it here for instant response:
    setCurrentUser(credential.user);
    setUserProfile(profile);
    setError(null);

    return profile;
  };

  const logout = async (): Promise<void> => {
    await signOut(auth);
    setCurrentUser(null);
    setUserProfile(null);
    setError(null);
  };

  return (
    <AuthContext.Provider value={{ currentUser, userProfile, loading, login, logout, error }}>
      {children}
    </AuthContext.Provider>
  );
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};
