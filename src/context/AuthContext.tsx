import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { apiLogout } from '../api/auth';
import { apiGetMe } from '../api/user';
import { tokenStore } from '../api/client';
import type { User } from '../types';

interface AuthContextValue {
  isLoading: boolean;
  user: User | null;
  signIn: (token: string, user: User) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    (async () => {
      const token = await tokenStore.get();
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const me = await apiGetMe();
        setUser(me);
      } catch {
        await tokenStore.clear();
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const signIn = async (token: string, signedInUser: User) => {
    await tokenStore.set(token);
    setUser(signedInUser);
  };

  const signOut = async () => {
    try {
      await apiLogout();
    } catch {
      // token may already be invalid server-side — clear locally regardless
    }
    await tokenStore.clear();
    setUser(null);
  };

  const refreshUser = async () => {
    const me = await apiGetMe();
    setUser(me);
  };

  const value = useMemo(
    () => ({ isLoading, user, signIn, signOut, refreshUser }),
    [isLoading, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
