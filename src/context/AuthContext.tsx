'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  name: string;
  username?: string;
  email: string;
  role: string;
  profilePicture?: string;
  address?: string;
  gender?: string;
  bio?: string;
  wishlist?: string[];
  wishlistedServices?: string[];
  isVerified?: boolean;
  isPhoneVerified?: boolean;
  isOnVacation?: boolean;
  blockedUsers?: string[];
  verifiedCommunities?: any[];
  status?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (userData: User) => void;
  logout: () => void;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Load from cache or API on mount
  useEffect(() => {
    // 1. Check LocalStorage for an "optimistic" UI update
    const cachedUser = typeof window !== 'undefined' ? localStorage.getItem('recircle_user') : null;
    if (cachedUser) {
      try {
        setUser(JSON.parse(cachedUser));
      } catch (e) {
        console.error('Failed to parse cached user');
      }
    }

    async function loadUser() {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
          // Sync with LocalStorage for next time
          localStorage.setItem('recircle_user', JSON.stringify(data.user));
        } else {
          setUser(null);
          localStorage.removeItem('recircle_user');
        }
      } catch (error) {
        console.error('Failed to load user', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, []);

  const login = (userData: User) => {
    setUser(userData);
    localStorage.setItem('recircle_user', JSON.stringify(userData));
    router.push('/');
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout failed', error);
    } finally {
      setUser(null);
      localStorage.removeItem('recircle_user');
      router.push('/auth');
    }
  };

  const refreshUser = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        localStorage.setItem('recircle_user', JSON.stringify(data.user));
      } else {
        setUser(null);
        localStorage.removeItem('recircle_user');
      }
    } catch (error) {
      console.error('Failed to refresh user', error);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, setUser, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
