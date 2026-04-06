'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useAuth } from '@/context/AuthContext';
import NextImage from 'next/image';
import Loader from '@/components/Loader';
import CommunityManager from '@/components/CommunityManager';
import { siteConfig } from '@/lib/config';
import { confirmAction, showError, showSuccess } from '@/lib/confirm';

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
    const confirmed1 = await confirmAction({
      title: 'Delete Account?',
      text: 'WARNING: This is permanent. All your data, listings, and messages will be lost forever.',
      dangerMode: true,
      confirmButtonText: 'Delete Everything'
    });
    if (!confirmed1) return;

    const confirmed2 = await confirmAction({
      title: 'Final Warning',
      text: 'Are you absolutely sure? There is no going back after this.',
      dangerMode: true,
      confirmButtonText: 'Yes, DELETE MY ACCOUNT'
    });
    if (!confirmed2) return;
    try {
      setSaving(true);
      const res = await fetch('/api/profile/data', { method: 'DELETE' });
      if (res.ok) {
        showSuccess('Account Deleted', 'Your account and data have been removed.');
        setTimeout(() => {
            window.location.href = '/';
        }, 1500);
        // Clear local auth state before redirecting
        const auth = document.getElementById('auth-context-provider'); // No, let's just use what's available
        window.location.href = '/'; // Using window.location is safer to force a full context reset
      } else {
        const err = await res.json();
        showError('Deletion Failed', err.error || 'Failed to delete account');
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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 transition-colors duration-300">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Settings</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1 font-medium italic">Your hub for account preferences and privacy.</p>
      </div>
      
      {/* Appearance Section */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-sm border border-gray-100 dark:border-gray-700 rounded-3xl p-6 sm:p-8 mb-8 transition-all hover:shadow-md">
        <div className="flex items-center gap-3 mb-6">
           <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/40 rounded-2xl">
              <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>
           </div>
           <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight leading-none">Appearance</h2>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 max-w-sm">Customize how the platform looks on your device.</p>
        
        {mounted && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <button
              onClick={() => setTheme('light')}
              className={`flex flex-col items-center justify-center py-6 px-4 rounded-2xl border-2 transition-all active:scale-95 ${theme === 'light' ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 shadow-md' : 'border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:border-indigo-200'}`}
            >
              <div className="w-12 h-12 mb-3 rounded-full bg-white dark:bg-gray-900 flex items-center justify-center text-yellow-500 shadow-md border border-gray-100 dark:border-gray-700">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <span className="text-xs font-black uppercase tracking-widest text-gray-900 dark:text-white">Light</span>
            </button>
            
            <button
              onClick={() => setTheme('dark')}
              className={`flex flex-col items-center justify-center py-6 px-4 rounded-2xl border-2 transition-all active:scale-95 ${theme === 'dark' ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 shadow-md' : 'border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:border-indigo-200'}`}
            >
              <div className="w-12 h-12 mb-3 rounded-full bg-gray-900 flex items-center justify-center text-indigo-400 shadow-md border border-gray-800">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              </div>
              <span className="text-xs font-black uppercase tracking-widest text-gray-900 dark:text-white">Dark</span>
            </button>

            <button
              onClick={() => setTheme('system')}
              className={`col-span-2 sm:col-span-1 flex flex-col items-center justify-center py-6 px-4 rounded-2xl border-2 transition-all active:scale-95 ${theme === 'system' ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 shadow-md' : 'border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:border-indigo-200'}`}
            >
              <div className="w-12 h-12 mb-3 rounded-full bg-gray-50 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 shadow-md border border-gray-200 dark:border-gray-600">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="text-xs font-black uppercase tracking-widest text-gray-900 dark:text-white">System</span>
            </button>
          </div>
        )}
      </div>

      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-sm border border-gray-100 dark:border-gray-700 rounded-3xl p-6 sm:p-8 transition-all hover:shadow-md mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div className="flex items-center gap-3">
               <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/40 rounded-2xl">
                  <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0-6V9m0 12a9 9 0 110-18 9 9 0 010 18z" /></svg>
               </div>
               <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight leading-none">Privacy & Safety</h2>
            </div>
            <button
                onClick={() => router.push('/profile/edit')}
                className="text-xs font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 px-5 py-2.5 bg-indigo-50 dark:bg-indigo-900/40 rounded-xl transition-all active:scale-95"
            >
                Edit Info &rarr;
            </button>
        </div>
        
        {message && (
          <div className={`mb-8 p-4 rounded-2xl text-sm font-bold flex items-center gap-3 animate-in fade-in slide-in-from-top-2 overflow-hidden ${message.includes('success') ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/50' : 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border border-rose-100 dark:border-rose-800/50'}`}>
            <span className="shrink-0 w-2 h-2 rounded-full bg-current animate-pulse" />
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="p-5 sm:p-7 bg-gray-50/50 dark:bg-gray-900/30 rounded-3xl border border-gray-100 dark:border-gray-700/50 hover:bg-white dark:hover:bg-gray-900/50 transition-all group">
            <div className="flex items-center justify-between">
              <div className="pr-4">
                <label htmlFor="allowEmailContact" className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest italic leading-none block mb-2">Email Visibility</label>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Allow people to find you via email for external communication.</p>
              </div>
              
              <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                <input 
                  type="checkbox" 
                  id="allowEmailContact" 
                  className="sr-only peer" 
                  checked={allowEmailContact}
                  onChange={(e) => setAllowEmailContact(e.target.checked)}
                />
                <div className="w-14 h-7 bg-gray-200 dark:bg-gray-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-[20px] after:w-[20px] after:transition-all peer-checked:bg-indigo-600 dark:peer-checked:bg-indigo-500 shadow-inner ring-4 ring-transparent group-hover:ring-indigo-100 dark:group-hover:ring-indigo-900/20"></div>
              </label>
            </div>
          </div>

          <div className="p-5 sm:p-7 bg-gray-50/50 dark:bg-gray-900/30 rounded-3xl border border-gray-100 dark:border-gray-700/50 hover:bg-white dark:hover:bg-gray-900/50 transition-all group">
            <div className="flex items-center justify-between">
              <div className="pr-4">
                <label htmlFor="allowPhoneContact" className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest italic leading-none block mb-2">Phone Visibility</label>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Show your phone number to verified campus members.</p>
              </div>
              
              <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                <input 
                  type="checkbox" 
                  id="allowPhoneContact" 
                  className="sr-only peer" 
                  checked={allowPhoneContact}
                  onChange={(e) => setAllowPhoneContact(e.target.checked)}
                />
                <div className="w-14 h-7 bg-gray-200 dark:bg-gray-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-[20px] after:w-[20px] after:transition-all peer-checked:bg-indigo-600 dark:peer-checked:bg-indigo-500 shadow-inner ring-4 ring-transparent group-hover:ring-indigo-100 dark:group-hover:ring-indigo-900/20"></div>
              </label>
            </div>
          </div>

          <div className="p-5 sm:p-7 bg-amber-50/30 dark:bg-amber-900/10 rounded-3xl border border-amber-100 dark:border-amber-900/30 hover:bg-amber-50/50 dark:hover:bg-amber-900/20 transition-all group">
            <div className="flex items-center justify-between">
              <div className="pr-4">
                <label htmlFor="isOnVacation" className="text-sm font-black text-amber-700 dark:text-amber-400 uppercase tracking-widest italic leading-none block mb-2">Vacation Mode</label>
                <p className="text-xs text-amber-600/70 dark:text-amber-500/70 font-medium">Temporarily hide your listings while you're away.</p>
              </div>
              
              <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                <input 
                  type="checkbox" 
                  id="isOnVacation" 
                  className="sr-only peer" 
                  checked={isOnVacation}
                  onChange={(e) => setIsOnVacation(e.target.checked)}
                />
                <div className="w-14 h-7 bg-gray-200 dark:bg-gray-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-[20px] after:w-[20px] after:transition-all peer-checked:bg-amber-500 dark:peer-checked:bg-amber-600 shadow-inner ring-4 ring-transparent group-hover:ring-amber-100 dark:group-hover:ring-amber-900/20"></div>
              </label>
            </div>
          </div>

          {/* Blocked Users Section */}
          <div className="mt-12 pt-10 border-t border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-8">
               <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Blocked People</h3>
               <span className="px-3 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-[10px] font-black rounded-full border border-gray-200 dark:border-gray-600">{blockedUsers.length}</span>
            </div>
            
            {blockedUsers.length === 0 ? (
              <div className="text-center py-16 bg-gray-50/50 dark:bg-gray-900/30 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-700 transition-colors">
                <div className="w-16 h-16 bg-white dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm border border-gray-100 dark:border-gray-700">
                   <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest italic opacity-50">Peaceful. No one here.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {blockedUsers.map(blockedUser => (
                  <div key={blockedUser._id} className="flex items-center justify-between p-4 bg-white/50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm transition-all hover:bg-rose-50/30 dark:hover:bg-rose-900/10">
                    <Link href={`/profile/${blockedUser._id}`} className="flex items-center gap-3 group flex-1 min-w-0">
                      <div className="h-12 w-12 shrink-0 rounded-2xl bg-indigo-50 dark:bg-indigo-900/50 flex items-center justify-center font-bold text-indigo-600 dark:text-indigo-400 overflow-hidden relative border-2 border-white dark:border-gray-800 shadow-md group-hover:rotate-3 transition-all">
                        {blockedUser.profilePicture ? (
                           <NextImage src={blockedUser.profilePicture} alt={blockedUser.name} width={48} height={48} className="object-cover w-full h-full" referrerPolicy="no-referrer" />
                        ) : (
                           blockedUser.name?.charAt(0).toUpperCase() || 'U'
                        )}
                      </div>
                      <div className="truncate">
                        <p className="text-sm font-black text-gray-900 dark:text-white truncate tracking-tight">{blockedUser.name}</p>
                        <p className="text-[10px] uppercase font-black text-gray-400 tracking-widest mt-0.5 opacity-70">@{blockedUser.username}</p>
                      </div>
                    </Link>
                    
                    <button
                      type="button"
                      onClick={() => handleUnblock(blockedUser._id)}
                      disabled={unblockingId === blockedUser._id}
                      className="px-4 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:scale-105 active:scale-95 disabled:opacity-50 transition-all shrink-0 shadow-lg"
                    >
                      {unblockingId === blockedUser._id ? '...' : 'Unblock'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end pt-10 border-t border-gray-100 dark:border-gray-700">
            <button
              type="submit"
              disabled={saving}
              className="w-full sm:w-auto inline-flex justify-center items-center gap-3 py-4 px-12 border border-transparent text-sm font-black uppercase tracking-widest rounded-2xl text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 shadow-2xl shadow-indigo-100 dark:shadow-none focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-all active:scale-95 group"
            >
              {saving ? (
                <>
                  <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  Save Changes
                  <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      <div className="mb-8">
        <CommunityManager />
      </div>

       <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-sm border border-gray-100 dark:border-gray-700 rounded-3xl p-6 sm:p-10 mb-8 transition-all hover:shadow-md">
          <div className="flex items-center gap-4 mb-6">
             <div className="p-3 bg-blue-50 dark:bg-blue-900/40 rounded-2xl">
                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
             </div>
             <div>
                <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Need help?</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium tracking-tight">Our campus admin team is here for you 24/7.</p>
             </div>
          </div>
          <a
            href={`mailto:${siteConfig.supportEmail}?subject=Support%20Request%20-%20ReCircle`}
            className="inline-flex items-center justify-center w-full px-8 py-4 border-2 border-blue-100 dark:border-blue-900/50 text-sm font-black uppercase tracking-widest rounded-2xl text-blue-700 dark:text-blue-400 bg-blue-50/20 dark:bg-blue-900/10 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-all active:scale-[0.98] gap-3"
          >
            Send Support Ticket
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </a>
       </div>

       <div className="bg-rose-50/40 dark:bg-rose-950/20 backdrop-blur-sm shadow-sm border border-rose-100 dark:border-rose-900/40 rounded-3xl p-6 sm:p-10 transition-all hover:border-rose-200 dark:hover:border-rose-800">
          <div className="flex items-center gap-4 mb-6">
             <div className="p-3 bg-rose-100 dark:bg-rose-900/60 rounded-2xl shadow-sm">
                <svg className="w-6 h-6 text-rose-600 dark:text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
             </div>
             <div>
                <h2 className="text-2xl font-black text-rose-800 dark:text-rose-400 tracking-tight leading-none mb-1">Danger Zone</h2>
                <p className="text-sm text-rose-600/80 dark:text-rose-500/80 font-medium">Think twice. This action is absolutely permanent.</p>
             </div>
          </div>
          <button type="button" onClick={handleDeleteAccount} disabled={saving} className="w-full px-8 py-4 text-sm font-black uppercase tracking-widest rounded-2xl border-2 border-rose-200 dark:border-rose-900/60 bg-white dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 hover:bg-rose-600 hover:text-white dark:hover:bg-rose-600 transition-all active:scale-[0.98] shadow-sm">
             {saving ? 'Processing Account Wipe...' : 'Delete Account Permanently'}
          </button>
       </div>
    </div>

  );
}
