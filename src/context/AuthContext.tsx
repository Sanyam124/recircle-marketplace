'use client';

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
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
    // Safety timeout to prevent infinite loading screen (e.g. if fetch hangs)
    const timeoutId = setTimeout(() => {
      setLoading(false);
    }, 8000); 

    async function loadUser() {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
          localStorage.setItem('recircle_user', JSON.stringify(data.user));
        } else if (res.status === 401) {
          setUser(null);
          localStorage.removeItem('recircle_user');
        }
      } catch (error) {
        console.warn('Network issue during auth check:', error);
      } finally {
        setLoading(false);
        clearTimeout(timeoutId);
      }
    }

    loadUser();
    return () => clearTimeout(timeoutId);
  }, []);

  const login = (userData: User) => {
    setUser(userData);
    localStorage.setItem('recircle_user', JSON.stringify(userData));
    window.location.href = '/explore'; 
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout failed', error);
    } finally {
      setUser(null);
      localStorage.removeItem('recircle_user');
      window.location.href = '/auth';
    }
  };

  const refreshUser = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        localStorage.setItem('recircle_user', JSON.stringify(data.user));
      } else if (res.status === 401) {
        setUser(null);
        localStorage.removeItem('recircle_user');
      }
    } catch (error) {
      console.warn('User refresh failed due to network:', error);
    }
  };

  const authContextValue = useMemo(() => ({ 
    user, 
    loading, 
    login, 
    logout, 
    setUser, 
    refreshUser 
  }), [user, loading]);

  return (
    <AuthContext.Provider value={authContextValue}>
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
