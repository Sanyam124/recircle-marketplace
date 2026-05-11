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
  notifyOffers?: boolean;
  notifyMessages?: boolean;
  showOnlineStatus?: boolean;
  compactView?: boolean;
  defaultCommunity?: string;
  defaultHostel?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  userLocation: { lat: number; lng: number } | null;
  login: (userData: User, newCommunities?: string[]) => void;
  logout: () => void;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  refreshUser: () => Promise<void>;
  refreshLocation: (onSuccess?: (loc: { lat: number, lng: number }) => void, onError?: (err: any) => void) => void;
  celebratingCommunities: string[] | null;
  triggerCelebration: (names: string[]) => void;
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [celebratingCommunities, setCelebratingCommunities] = useState<string[] | null>(null);
  const [rateLimited, setRateLimited] = useState<number | null>(null); // cooldown in seconds
  const router = useRouter();

  // Handle global rate limit event
  useEffect(() => {
    const handleRateLimit = (e: any) => {
      setRateLimited(e.detail?.retryAfter || 30);
    };
    window.addEventListener('app-rate-limit', handleRateLimit);
    return () => window.removeEventListener('app-rate-limit', handleRateLimit);
  }, []);

  // Cooldown timer and Body Lock
  useEffect(() => {
    if (rateLimited !== null && rateLimited > 0) {
      document.body.style.overflow = 'hidden';
      const timer = setInterval(() => {
        setRateLimited(prev => (prev && prev > 0) ? prev - 1 : 0);
      }, 1000);
      return () => {
        clearInterval(timer);
        document.body.style.overflow = 'auto';
      };
    } else {
      if (rateLimited === 0) setRateLimited(null);
      document.body.style.overflow = 'auto';
    }
  }, [rateLimited]);

  const refreshLocation = (onSuccess?: (loc: { lat: number, lng: number }) => void, onError?: (err: GeolocationPositionError) => void) => {
    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc = { lat: position.coords.latitude, lng: position.coords.longitude };
          setUserLocation(loc);
          sessionStorage.setItem('recircle_location', JSON.stringify(loc));
          if (onSuccess) onSuccess(loc);
        },
        (error) => {
          console.warn('Geolocation error:', error);
          if (onError) onError(error);
        },
        { timeout: 10000, maximumAge: 60000, enableHighAccuracy: true }
      );
    } else {
       if (onError) onError({ code: 0, message: 'Geolocation not supported', PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 } as any);
    }
  };

  // Improved fetch with rate limit detection
  const authFetch = async (url: string, options?: RequestInit) => {
    return fetch(url, options);
  };

  // Load from cache or API on mount
  useEffect(() => {
    // Try to restore location from session storage
    if (typeof window !== 'undefined') {
      const storedLoc = sessionStorage.getItem('recircle_location');
      if (storedLoc) {
        try {
          setUserLocation(JSON.parse(storedLoc));
        } catch (e) {
          // ignore
        }
      } else {
        refreshLocation(); // Fetch if not in session
      }
    }
    
    // Safety timeout
    const timeoutId = setTimeout(() => {
      setLoading(false);
    }, 8000); 

    async function loadUser() {
      if (typeof window !== 'undefined') {
        const cachedUser = localStorage.getItem('recircle_user');
        if (cachedUser) {
          try {
            setUser(JSON.parse(cachedUser));
          } catch (e) {}
        }
      }

      try {
        const res = await authFetch('/api/auth/me');
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

  const triggerCelebration = (names: string[]) => {
    setCelebratingCommunities(names);
    // Auto-clear after 5.5s (slightly longer than component duration)
    setTimeout(() => {
      setCelebratingCommunities(null);
    }, 5500);
  };

  // Global Fetch Interceptor to catch all 429s site-wide
  useEffect(() => {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const res = await originalFetch(...args);
      
      // If our API returns 429, trigger the unified root overlay
      if (res.status === 429) {
        const url = args[0]?.toString() || '';
        // Only trigger for our own API to avoid interfering with third-party calls
        if (url.startsWith('/api') || url.includes(window.location.origin + '/api')) {
          const data = await res.clone().json().catch(() => ({}));
          const retryAfter = data.retryAfter || 30;
          window.dispatchEvent(new CustomEvent('app-rate-limit', { detail: { retryAfter } }));
        }
      }
      return res;
    };

    return () => {
      window.fetch = originalFetch; // Restore on unmount
    };
  }, []);

  const login = (userData: User, newCommunities?: string[]) => {
    setUser(userData);
    localStorage.setItem('recircle_user', JSON.stringify(userData));
    
    const hasCelebration = newCommunities && newCommunities.length > 0;
    if (hasCelebration) {
      triggerCelebration(newCommunities);
    }
    
    // Use a small delay for cookie to settle in some browsers, then hard reload
    // to bypass Next.js prefetch cache madness
    // If celebrating, wait 5s so the user can see the celebration first
    setTimeout(() => {
      const searchParams = new URLSearchParams(window.location.search);
      const redirect = searchParams.get('redirect') || '/explore';
      window.location.href = redirect;
    }, hasCelebration ? 5000 : 100);
  };

  const logout = async () => {
    try {
      await authFetch('/api/auth/logout', { method: 'POST' });
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
      const res = await authFetch('/api/auth/me');
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
    userLocation,
    login, 
    logout, 
    setUser, 
    refreshUser,
    refreshLocation,
    celebratingCommunities,
    triggerCelebration,
    authFetch
  }), [user, loading, userLocation, celebratingCommunities, authFetch]);

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
      
      {/* Rate Limit Blurry Modal Overlay */}
      {rateLimited !== null && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 overflow-hidden pointer-events-auto">
          {/* Blur Backdrop */}
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-xl animate-in fade-in duration-500" />
          
          {/* Modal Content */}
          <div className="relative bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-2xl p-10 max-w-md w-full text-center border border-white/20 dark:border-gray-700 animate-in zoom-in-95 duration-300">
             <div className="text-7xl mb-6 block animate-bounce drop-shadow-lg">🐢</div>
              <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-3 uppercase italic tracking-tighter leading-none">
                Wohh, you are going too fast!
              </h2>
             <p className="text-gray-500 dark:text-gray-400 mb-8 font-semibold italic text-sm leading-relaxed">
                You&apos;re moving faster than we can keep up with. Please take a quick break before refreshing.
             </p>
             
              <div className="space-y-4">
                <div className="w-full py-5 px-8 rounded-[2rem] font-black bg-gray-50 dark:bg-gray-900/50 text-gray-400 shadow-inner border border-gray-100 dark:border-gray-700 flex flex-col items-center">
                  <span className="text-[10px] uppercase tracking-[0.2em] opacity-40 mb-2 font-black">Cooldown Remaining</span>
                  <div className="flex items-baseline gap-1">
                    {rateLimited > 60 ? (
                      <span className="text-5xl tabular-nums text-indigo-600 dark:text-indigo-400 drop-shadow-sm">
                        {Math.floor(rateLimited / 60)}:{(rateLimited % 60).toString().padStart(2, '0')}
                      </span>
                    ) : (
                      <>
                        <span className="text-5xl tabular-nums text-indigo-600 dark:text-indigo-400 drop-shadow-sm">{rateLimited}</span>
                        <span className="text-lg text-indigo-400/50">s</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-center gap-2">
                   <div className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
                   <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">
                     Anti-Spam Shield Active
                   </p>
                   <div className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
                </div>
             </div>
          </div>
        </div>
      )}
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
