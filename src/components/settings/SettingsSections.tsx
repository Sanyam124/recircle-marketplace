import React from 'react';
import Link from 'next/link';
import { ToggleRow, ThemeButton } from './SettingsShared';
import { siteConfig } from '@/lib/config';
import { confirmAction } from '@/lib/confirm';
import CommunityManager from '../CommunityManager';

/**
 * Notifications Section
 */
export function NotificationsSection({ prefs, updatePreference, saving }: any) {
    return (
        <div className="space-y-4 animate-in fade-in duration-700">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 italic mb-6 ml-4">Notification Control</h3>
            <div className="grid grid-cols-1 gap-4">
                <ToggleRow title="Chat Pings" desc="Native alerts for direct messages." checked={prefs.notifyMessages} onChange={(v) => updatePreference('notifyMessages', v)} loading={saving === 'notifyMessages'} />
                <ToggleRow title="Marketplace Pings" desc="Alerts for buy/rent/service offers." checked={prefs.notifyOffers} onChange={(v) => updatePreference('notifyOffers', v)} loading={saving === 'notifyOffers'} />
            </div>
        </div>
    );
}

/**
 * Privacy Section
 */
export function PrivacySection({ prefs, updatePreference, saving, blockedUsers, onUnblock, phone }: any) {
    const isPhoneEmpty = !phone || phone.trim() === '';
    return (
        <div className="space-y-4 animate-in fade-in duration-700">
            <div className="grid grid-cols-1 gap-4">
                <ToggleRow title="Email Privacy" desc="Show email on your profile." checked={prefs.allowEmailContact} onChange={(v) => updatePreference('allowEmailContact', v)} loading={saving === 'allowEmailContact'} />
                <ToggleRow 
                    title="Phone Privacy" 
                    desc={isPhoneEmpty ? "No phone number set." : "Visible ONLY to verified members."} 
                    checked={!isPhoneEmpty && prefs.allowPhoneContact} 
                    onChange={(v) => updatePreference('allowPhoneContact', v)} 
                    loading={saving === 'allowPhoneContact'} 
                    disabled={isPhoneEmpty}
                />
                <ToggleRow title="Active Bubble" desc="Show a green live presence dot." checked={prefs.showOnlineStatus} onChange={(v) => updatePreference('showOnlineStatus', v)} loading={saving === 'showOnlineStatus'} />
                <ToggleRow title="Vacation Mode" desc="Archive and hide all listings." checked={prefs.isOnVacation} onChange={(v) => updatePreference('isOnVacation', v)} loading={saving === 'isOnVacation'} color="amber" />
            </div>
            {blockedUsers.length > 0 && (
                <div className="mt-8 p-6 bg-slate-50 dark:bg-slate-900/40 rounded-3xl border border-slate-100 dark:border-slate-800">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6 italic">Blocked Members ({blockedUsers.length})</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {blockedUsers.map((u:any) => (
                            <div key={u._id} className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                                <span className="text-[10px] font-black truncate px-2">@{u.username}</span>
                                <button onClick={async () => { await fetch(`/api/user/block?userId=${u._id}`, { method: 'DELETE' }); onUnblock(); }} className="text-[9px] font-black uppercase text-rose-500 hover:text-rose-600 px-2 tracking-widest italic">Free</button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

/**
 * Appearance Section
 */
export function AppearanceSection({ theme, setTheme, prefs, updatePreference, saving, user }: any) {
    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <div className="grid grid-cols-3 gap-4">
                <ThemeButton active={theme === 'light'} onClick={() => setTheme('light')} lab="Light" emoji="☀️" />
                <ThemeButton active={theme === 'dark'} onClick={() => setTheme('dark')} lab="Dark" emoji="🌌" />
                <ThemeButton active={theme === 'system'} onClick={() => setTheme('system')} lab="Auto" emoji="💻" />
            </div>
            <div className="p-6 bg-white dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-sm">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic mb-6">Landing Feed</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-indigo-600/60 ml-2 italic">Default Feed</label>
                        <select value={prefs.defaultCommunity} onChange={(e) => updatePreference('defaultCommunity', e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 px-4 py-3 rounded-2xl border-none text-[11px] font-black outline-none appearance-none">
                            <option value="">🌏 Unified Feed</option>
                            {user?.verifiedCommunities?.map((c: any) => <option key={c._id} value={c._id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-indigo-600/60 ml-2 italic">Grid Density</label>
                        <ToggleRow title="Compact View" desc="5-column layout on PC." checked={prefs.compactView} onChange={(v) => updatePreference('compactView', v)} loading={saving === 'compactView'} />
                    </div>
                </div>
            </div>
        </div>
    );
}

/**
 * Account Section
 */
export function AccountSection() {
    const handleDelete = async () => {
        const confirmed = await confirmAction({ title: 'Wipe Account?', text: 'This is permanent.', dangerMode: true });
        if (confirmed) {
            const res = await fetch('/api/profile/data', { method: 'DELETE' });
            if (res.ok) window.location.href = '/';
        }
    };
    return (
        <div className="flex flex-col md:flex-row gap-4 animate-in fade-in duration-700">
             <div className="flex-1 p-8 bg-blue-50/50 dark:bg-blue-900/10 border-2 border-dashed border-blue-100 dark:border-blue-900/30 rounded-[2.5rem] text-center">
                <h4 className="text-xl font-black italic mb-4 text-blue-900">Support</h4>
                <Link href={`mailto:${siteConfig.supportEmail}`} className="inline-block px-8 py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest">Email Support</Link>
             </div>
             <div className="flex-1 p-8 bg-rose-50/50 dark:bg-rose-950/10 border-2 border-dashed border-rose-100 dark:border-rose-900/30 rounded-[2.5rem] text-center">
                <h4 className="text-xl font-black italic mb-4 text-rose-900">Danger Zone</h4>
                <button onClick={handleDelete} className="px-8 py-3 border-2 border-rose-200 text-rose-600 hover:bg-rose-600 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">Delete Account</button>
             </div>
        </div>
    );
}

export function CirclesSection() {
    return <div className="space-y-6 animate-in fade-in duration-700"><CommunityManager /></div>;
}
