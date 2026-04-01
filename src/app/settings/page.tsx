'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useAuth } from '@/context/AuthContext';
import Loader from '@/components/Loader';
import CommunityManager from '@/components/CommunityManager';
import { siteConfig } from '@/lib/config';

export default function SettingsPage() {
  const router = useRouter();
  const { user, loading: authLoading, refreshUser } = useAuth();
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (!authLoading && !user) {
      router.push(`/auth?redirect=${encodeURIComponent('/settings')}`);
    }
  }, [user, authLoading, router]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
   const [allowEmailContact, setAllowEmailContact] = useState(false);
   const [allowPhoneContact, setAllowPhoneContact] = useState(false);
   const [isOnVacation, setIsOnVacation] = useState(false);
   const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
   const [unblockingId, setUnblockingId] = useState<string | null>(null);
  
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
      setMounted(true);
      fetchUserData();
  }, []);

  const fetchUserData = async () => {
      try {
          const res = await fetch('/api/profile/data');
          if (res.ok) {
              const data = await res.json();
              setAllowEmailContact(!!data.user?.allowEmailContact);
              setAllowPhoneContact(!!data.user?.allowPhoneContact);
              setIsOnVacation(!!data.user?.isOnVacation);
          }
          
          // Fetch blocked users details
          const blockRes = await fetch('/api/user/blocked');
          if (blockRes.ok) {
              const blockData = await blockRes.json();
              setBlockedUsers(blockData.blockedUsers || []);
          }
      } catch (error) {
          console.error('Failed to load user settings', error);
      } finally {
          setLoading(false);
      }
  };


  const handleDeleteAccount = async () => {
    if (!confirm('WARNING: Delete your account? This is permanent.')) return;
    if (!confirm('Last warning. Everything will be gone. Proceed?')) return;
    try {
      setSaving(true);
      const res = await fetch('/api/profile/data', { method: 'DELETE' });
      if (res.ok) {
        alert('Account deleted.');
        // Clear local auth state before redirecting
        const auth = document.getElementById('auth-context-provider'); // No, let's just use what's available
        window.location.href = '/'; // Using window.location is safer to force a full context reset
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to delete account');
        setSaving(false);
      }
    } catch { setSaving(false); }
  };

  const handleUnblock = async (userId: string) => {
    try {
      setUnblockingId(userId);
      const res = await fetch(`/api/user/block?userId=${userId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setBlockedUsers(prev => prev.filter(u => u._id !== userId));
        await refreshUser();
        setMessage('User successfully unblocked');
      } else {
        setMessage('Failed to unblock user');
      }
    } catch (error) {
      console.error(error);
      setMessage('Error unblocking user');
    } finally {
      setUnblockingId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      const res = await fetch('/api/profile/data', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allowEmailContact, allowPhoneContact, isOnVacation }),
      });

      if (res.ok) {
        setMessage('Settings updated successfully');
      } else {
        setMessage('Failed to update settings');
      }
    } catch (error) {
      console.error(error);
      setMessage('An error occurred');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) return <Loader />;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 transition-colors duration-300">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Settings</h1>
      
      {/* Appearance Section */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-8 transition-colors duration-300">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Appearance</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">Customize how ReCircle looks on your device.</p>
        
        {mounted && (
          <div className="flex gap-4">
            <button
              onClick={() => setTheme('light')}
              className={`flex-1 flex flex-col items-center justify-center py-4 px-4 rounded-xl border-2 transition-all ${theme === 'light' ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 dark:border-indigo-500' : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-gray-600'}`}
            >
              <div className="w-10 h-10 mb-2 rounded-full bg-gray-100 flex items-center justify-center text-yellow-500">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">Light</span>
            </button>
            
            <button
              onClick={() => setTheme('dark')}
              className={`flex-1 flex flex-col items-center justify-center py-4 px-4 rounded-xl border-2 transition-all ${theme === 'dark' ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 dark:border-indigo-500' : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-gray-600'}`}
            >
              <div className="w-10 h-10 mb-2 rounded-full bg-gray-800 flex items-center justify-center text-indigo-400">
                <svg className="w-5 h-5" fill="solid" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              </div>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">Dark</span>
            </button>

            <button
              onClick={() => setTheme('system')}
              className={`flex-1 flex flex-col items-center justify-center py-4 px-4 rounded-xl border-2 transition-all ${theme === 'system' ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 dark:border-indigo-500' : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-gray-600'}`}
            >
              <div className="w-10 h-10 mb-2 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">System</span>
            </button>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 transition-colors duration-300">
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">Privacy & Notifications</h2>
            <button
                onClick={() => router.push('/profile/edit')}
                className="text-sm text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
            >
                Edit Profile Info instead &rarr;
            </button>
        </div>
        
        {message && (
          <div className={`mb-4 p-3 rounded text-sm ${message.includes('success') ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          
          <div className="flex items-center justify-between mb-6">
            <div>
              <label htmlFor="allowEmailContact" className="text-sm font-bold text-gray-900 dark:text-white">Allow Contact via Email</label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Let other users see your email address and contact you outside of the platform.</p>
            </div>
            
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                id="allowEmailContact" 
                className="sr-only peer" 
                checked={allowEmailContact}
                onChange={(e) => setAllowEmailContact(e.target.checked)}
              />
              <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600 dark:peer-checked:bg-indigo-500"></div>
            </label>
          </div>

          <div className="flex items-center justify-between mb-6">
            <div>
              <label htmlFor="allowPhoneContact" className="text-sm font-bold text-gray-900 dark:text-white">Allow Contact via Phone</label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Let other users see your phone number and contact you outside of the platform.</p>
            </div>
            
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                id="allowPhoneContact" 
                className="sr-only peer" 
                checked={allowPhoneContact}
                onChange={(e) => setAllowPhoneContact(e.target.checked)}
              />
              <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600 dark:peer-checked:bg-indigo-500"></div>
            </label>
          </div>

          <div className="flex items-center justify-between mb-6">
            <div>
              <label htmlFor="isOnVacation" className="text-sm font-bold text-gray-900 dark:text-white">Vacation Mode</label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Temporarily hide all your products and services from the feed. Perfect for semester breaks!</p>
            </div>
            
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                id="isOnVacation" 
                className="sr-only peer" 
                checked={isOnVacation}
                onChange={(e) => setIsOnVacation(e.target.checked)}
              />
              <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500 dark:peer-checked:bg-amber-600"></div>
            </label>
          </div>

          {/* Blocked Users Section */}
          <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Blocked Users</h3>
            
            {blockedUsers.length === 0 ? (
              <div className="text-center py-6 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-500 dark:text-gray-400">You haven't blocked any users yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {blockedUsers.map(blockedUser => (
                  <div key={blockedUser._id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-600">
                    <Link href={`/profile/${blockedUser._id}`} className="flex items-center gap-3 group hover:opacity-80 transition-opacity flex-1 min-w-0">
                      <div className="h-10 w-10 shrink-0 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center font-bold text-gray-600 dark:text-gray-300 overflow-hidden relative border border-gray-300 dark:border-gray-500 shadow-sm group-hover:ring-2 group-hover:ring-indigo-400 group-hover:ring-offset-1 transition-all">
                        {blockedUser.profilePicture ? (
                           <img src={blockedUser.profilePicture} alt={blockedUser.name} className="object-cover w-full h-full" />
                        ) : (
                           blockedUser.name?.charAt(0).toUpperCase() || 'U'
                        )}
                      </div>
                      <div className="truncate">
                        <p className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">{blockedUser.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">@{blockedUser.username}</p>
                      </div>
                    </Link>
                    
                    <button
                      type="button"
                      onClick={() => handleUnblock(blockedUser._id)}
                      disabled={unblockingId === blockedUser._id}
                      className="px-4 py-1.5 text-xs font-bold rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors shadow-sm active:scale-95"
                    >
                      {unblockingId === blockedUser._id ? 'Unblocking...' : 'Unblock'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>



          <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-gray-700">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex justify-center py-2 px-6 border border-transparent shadow-sm text-sm font-bold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>

      <CommunityManager />

       <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mt-8 transition-colors duration-300">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Help & Support</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Need assistance or want to report an issue? Contact the administration team directly.</p>
          <a
            href={`mailto:${siteConfig.supportEmail}?subject=Support%20Request%20-%20ReCircle`}
            className="inline-flex items-center justify-center px-5 py-2.5 border border-indigo-200 dark:border-indigo-800 text-sm font-bold rounded-xl text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 shadow-sm transition-all active:scale-95 gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Contact Support
          </a>
       </div>

       <div className="bg-red-50 dark:bg-red-900/20 shadow rounded-lg p-6 mt-8 border border-red-100 dark:border-red-900/30 transition-colors duration-300">
          <h2 className="text-lg font-medium text-red-800 dark:text-red-400 mb-2">Danger Zone</h2>
          <p className="text-sm text-red-600 dark:text-red-300 mb-4">Once you delete your account, there is no going back. Please be certain.</p>
          <button type="button" onClick={handleDeleteAccount} disabled={saving} className="text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 bg-white dark:bg-transparent hover:bg-red-50 dark:hover:bg-red-900/50 font-medium rounded-lg text-sm px-5 py-2.5 text-center disabled:opacity-50 transition-colors">
             {saving ? 'Processing...' : 'Delete Account'}
          </button>
       </div>
    </div>
  );
}
