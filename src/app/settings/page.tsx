'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useAuth } from '@/context/AuthContext';
import NextImage from 'next/image';
import Loader from '@/components/Loader';
import CommunityManager from '@/components/CommunityManager';
import ImageUpload from '@/components/ImageUpload';
import { siteConfig } from '@/lib/config';
import { confirmAction, showError, showSuccess } from '@/lib/confirm';

type SettingsTab = 'profile' | 'notifications' | 'circles' | 'privacy' | 'appearance' | 'account';

export default function SettingsPage() {
    const router = useRouter();
    const { user, loading: authLoading, refreshUser } = useAuth();
    const { theme, setTheme } = useTheme();
    
    const [activeTab, setActiveTab] = useState<SettingsTab | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [mounted, setMounted] = useState(false);
    
    // Notification & UI Prefs
    const [prefs, setPrefs] = useState({
        allowEmailContact: false,
        allowPhoneContact: false,
        isOnVacation: false,
        showOnlineStatus: true,
        notifyOffers: true,
        notifyMessages: true,
        notifyNewsletter: true,
        notifyCommunity: true,
        notifySecurity: true,
        compactView: false,
        defaultCommunity: '',
        defaultHostel: ''
    });

    // Profile Form State
    const [profileForm, setProfileForm] = useState({
        name: '',
        username: '',
        gender: 'none',
        bio: '',
        phone: '',
        address: '',
        profilePicture: '',
        bannerImage: ''
    });

    const [siteDefaults, setSiteDefaults] = useState({
        avatars: [] as string[],
        banners: [] as string[]
    });

    // Mascot Studio State
    const [mascotStyle, setMascotStyle] = useState('notionists');
    const [mascotSeed, setMascotSeed] = useState(user?.username || 'ReCircle');
    const [mascotBg, setMascotBg] = useState('b6e3f4,c0aede,d1d4f9');

    const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
    
    const sidebarItems = [
        { id: 'profile', label: 'Profile', icon: <ProfileIcon /> },
        { id: 'notifications', label: 'Notifications', icon: <NotificationIcon /> },
        { id: 'circles', label: 'Communities', icon: <CircleIcon /> },
        { id: 'privacy', label: 'Privacy & Safety', icon: <PrivacyIcon /> },
        { id: 'appearance', label: 'Appearance', icon: <AppearanceIcon /> },
        { id: 'account', label: 'Account System', icon: <AccountIcon /> },
    ];

    useEffect(() => {
        setMounted(true);
        const searchParams = new URLSearchParams(window.location.search);
        const tabParam = searchParams.get('tab') as SettingsTab;
        
        if (tabParam && sidebarItems.some(i => i.id === tabParam)) {
            setActiveTab(tabParam);
        } else if (window.innerWidth >= 768 && !activeTab) {
            setActiveTab('profile');
        }
        
        if (!authLoading && !user) {
            router.push(`/auth?redirect=${encodeURIComponent('/settings')}`);
        } else if (user) {
            fetchUserData();
        }
    }, [user, authLoading]);

    const fetchUserData = async () => {
        try {
            const res = await fetch('/api/profile/data');
            if (res.ok) {
                const data = await res.json();
                const u = data.user;
                
                setPrefs({
                    allowEmailContact: !!u.allowEmailContact,
                    allowPhoneContact: !!u.allowPhoneContact,
                    isOnVacation: !!u.isOnVacation,
                    showOnlineStatus: u.showOnlineStatus ?? true,
                    notifyOffers: u.notifyOffers ?? true,
                    notifyMessages: u.notifyMessages ?? true,
                    notifyNewsletter: u.notifyNewsletter ?? true,
                    notifyCommunity: u.notifyCommunity ?? true,
                    notifySecurity: u.notifySecurity ?? true,
                    compactView: !!u.compactView,
                    defaultCommunity: u.defaultCommunity || '',
                    defaultHostel: u.defaultHostel || ''
                });

                setProfileForm({
                    name: u.name || '',
                    username: u.username || '',
                    gender: u.gender || 'none',
                    bio: u.bio || '',
                    phone: u.phone || '',
                    address: u.address || '',
                    profilePicture: u.profilePicture || '',
                    bannerImage: u.bannerImage || ''
                });

                // Fetch Config Defaults
                const configRes = await fetch('/api/site-config');
                if (configRes.ok) {
                    const configData = await configRes.json();
                    setSiteDefaults({
                        avatars: configData.defaultAvatars?.length > 0 ? configData.defaultAvatars : [
                            "https://res.cloudinary.com/dq3sl82at/image/upload/v1775879627/recircle/defaults/avatars/qgkgztxivymqpykcln9l.webp",
                            "https://res.cloudinary.com/dq3sl82at/image/upload/v1775879647/recircle/defaults/avatars/ziodytpld8wihr98ist3.webp",
                            "https://res.cloudinary.com/dq3sl82at/image/upload/v1775879674/recircle/defaults/avatars/ujoj8pesdwygl7prxhop.webp",
                            "https://res.cloudinary.com/dq3sl82at/image/upload/v1775879713/recircle/defaults/avatars/xlbrrk5k8fwajdg7atrd.webp",
                            "https://res.cloudinary.com/dq3sl82at/image/upload/v1775879779/recircle/defaults/avatars/tgl886mu6da8jute1kiw.webp",
                            "https://res.cloudinary.com/dq3sl82at/image/upload/v1775879809/recircle/defaults/avatars/f12ns9fpdk9vapfe3rso.webp",
                            "https://res.cloudinary.com/dq3sl82at/image/upload/v1775879826/recircle/defaults/avatars/njihd9oj1h1glmzuoinj.webp",
                            "https://res.cloudinary.com/dq3sl82at/image/upload/v1775879850/recircle/defaults/avatars/jpsd54f4ecrj7cjaxqzx.webp",
                            "https://res.cloudinary.com/dq3sl82at/image/upload/v1775879876/recircle/defaults/avatars/ulsdike1w01t9jej98jk.webp",
                            "https://res.cloudinary.com/dq3sl82at/image/upload/v1775879909/recircle/defaults/avatars/jubqhz3y1c2nialsskyk.webp",
                            "https://res.cloudinary.com/dq3sl82at/image/upload/v1775880073/recircle/defaults/avatars/ozw4w9mtamtwceivlqeg.webp",
                            "https://res.cloudinary.com/dq3sl82at/image/upload/v1775880093/recircle/defaults/avatars/m9e7dxc3jgkn63m78iod.webp",
                            "https://res.cloudinary.com/dq3sl82at/image/upload/v1775880201/recircle/defaults/avatars/xsycxnxgogtxl7mnab3k.webp",
                            "https://res.cloudinary.com/dq3sl82at/image/upload/v1775880241/recircle/defaults/avatars/n9s9vww8e4oyvdrpsvyf.webp",
                            "https://res.cloudinary.com/dq3sl82at/image/upload/v1775880375/recircle/defaults/avatars/ucpa2c3mhc463fweeceg.webp",
                            "https://res.cloudinary.com/dq3sl82at/image/upload/v1775880395/recircle/defaults/avatars/y0lecpk6ljmgwubxcrjd.webp",
                            "https://res.cloudinary.com/dq3sl82at/image/upload/v1775880512/recircle/defaults/avatars/ffmvy7tvldj5j7goij0f.webp",
                            "https://res.cloudinary.com/dq3sl82at/image/upload/v1775880578/recircle/defaults/avatars/kboynwhyyylpdymscflg.webp",
                            "https://res.cloudinary.com/dq3sl82at/image/upload/v1775880596/recircle/defaults/avatars/adrlyespwr2nisogppyx.webp",
                            "https://res.cloudinary.com/dq3sl82at/image/upload/v1775881528/recircle/defaults/avatars/yybdriyqunh4ja51n9fx.webp",
                            "https://res.cloudinary.com/dq3sl82at/image/upload/v1775881545/recircle/defaults/avatars/ygldm1alqtpzmfj0vzyt.webp",
                            "https://res.cloudinary.com/dq3sl82at/image/upload/v1775881575/recircle/defaults/avatars/ef0jnz9sj9noihldv0cj.webp",
                            "https://res.cloudinary.com/dq3sl82at/image/upload/v1775881609/recircle/defaults/avatars/phztoibugb66owdk3qn1.webp",
                            "https://res.cloudinary.com/dq3sl82at/image/upload/v1775881843/recircle/defaults/avatars/oluqzmzcp6vidvakutsu.webp",
                            "https://res.cloudinary.com/dq3sl82at/image/upload/v1775881865/recircle/defaults/avatars/vyll052nx0sn7pkpoy15.webp",
                            "https://res.cloudinary.com/dq3sl82at/image/upload/v1775881971/recircle/defaults/avatars/zsvvuu1tl9lftjkvsqts.webp",
                            "https://res.cloudinary.com/dq3sl82at/image/upload/v1775882001/recircle/defaults/avatars/urzgagig0ist1w70vbkq.webp",
                            "https://res.cloudinary.com/dq3sl82at/image/upload/v1775882116/recircle/defaults/avatars/vztuvy9ifmoyid7wsk2d.webp",
                            "https://res.cloudinary.com/dq3sl82at/image/upload/v1775882508/recircle/defaults/avatars/d7cpulnp0qgnk8oana7o.webp",
                            "https://res.cloudinary.com/dq3sl82at/image/upload/v1775882552/recircle/defaults/avatars/hg2uvgsalioeggawunvo.webp",
                            "https://res.cloudinary.com/dq3sl82at/image/upload/v1775882603/recircle/defaults/avatars/wgtkyyr93xsnklnx8zd4.webp",
                            "https://res.cloudinary.com/dq3sl82at/image/upload/v1775882949/recircle/defaults/avatars/aonclvo3yeuty9qopigl.webp",
                            "https://res.cloudinary.com/dq3sl82at/image/upload/v1775882965/recircle/defaults/avatars/xswlonkbehvlvgfcogy2.webp"
                        ],
                        banners: configData.defaultBanners?.length > 5 ? configData.defaultBanners : [
                            "https://res.cloudinary.com/dq3sl82at/image/upload/v1775884926/recircle/defaults/banners/uajyrck7hwyvtpayyjvg.jpg",
                            "https://res.cloudinary.com/dq3sl82at/image/upload/v1775884927/recircle/defaults/banners/zqdh9puexp455fkyqf36.jpg",
                            "https://res.cloudinary.com/dq3sl82at/image/upload/v1775884928/recircle/defaults/banners/rus9bykf5y3pzolfabte.jpg",
                            "https://res.cloudinary.com/dq3sl82at/image/upload/v1775884928/recircle/defaults/banners/xpmuv5kyvoqzedzej5wp.jpg",
                            "https://res.cloudinary.com/dq3sl82at/image/upload/v1775884929/recircle/defaults/banners/mnfbvgpadbmzzjmfd7db.jpg",
                            "https://res.cloudinary.com/dq3sl82at/image/upload/v1775884930/recircle/defaults/banners/wavqltixgy5dfcnvuv7y.jpg",
                            "https://res.cloudinary.com/dq3sl82at/image/upload/v1775884931/recircle/defaults/banners/l1kcurhb3gyrfilaiw8y.jpg",
                            "https://res.cloudinary.com/dq3sl82at/image/upload/v1775884932/recircle/defaults/banners/ontd1mq3hvvd4zklnhol.jpg",
                            "https://res.cloudinary.com/dq3sl82at/image/upload/v1775884933/recircle/defaults/banners/rnko4ck2wczrv34jzwu2.jpg",
                            "https://res.cloudinary.com/dq3sl82at/image/upload/v1775884934/recircle/defaults/banners/ulb2vmptaa6e6gayhzxu.jpg"
                        ]
                    });
                }
            }
            const blockRes = await fetch('/api/user/blocked');
            if (blockRes.ok) {
                const blockData = await blockRes.json();
                setBlockedUsers(blockData.blockedUsers || []);
            }
        } catch (error) { console.error(error); }
        finally { setLoading(false); }
    };

    const updatePreference = async (field: string, value: any) => {
        setSaving(field);
        let updateData: any = { [field]: value };
        let newPrefs = { ...prefs, [field]: value };

        if (field === 'defaultCommunity') {
            updateData.defaultHostel = '';
            newPrefs.defaultHostel = '';
        }

        setPrefs(newPrefs);
        try {
            const res = await fetch('/api/profile/data', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updateData),
            });
            if (res.ok) await refreshUser();
            else throw new Error();
        } catch (error) {
            showError('Save Error', 'Failed to update preference');
            setPrefs(prefs);
        } finally { setTimeout(() => setSaving(null), 400); }
    };

    const handleProfileSubmit = async (e?: React.FormEvent | React.MouseEvent) => {
        if (e && 'preventDefault' in e) e.preventDefault();
        setSubmitting(true);
        try {
            const updatePayload: any = { ...profileForm };
            if (!profileForm.phone) {
                updatePayload.allowPhoneContact = false;
            }
            const res = await fetch('/api/profile/data', {
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(updatePayload)
            });
            if (res.ok) {
                showSuccess('Success', 'Profile updated correctly.');
                await refreshUser();
                fetchUserData();
            } else {
                const data = await res.json();
                showError('Error', data.error || 'Update failed');
            }
        } catch (err) {
            showError('Error', 'Network error.');
        } finally { setSubmitting(false); }
    };

    // OTP functions removed as per request

    if (authLoading || loading || !mounted) return <Loader />;

    return (
        <div className="min-h-screen bg-[#FDFDFD] dark:bg-[#0A0A0A] transition-colors duration-500">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-16">
                <div className="flex flex-col md:flex-row gap-10">
                    {/* Sidebar */}
                    <aside className={`w-full md:w-64 shrink-0 ${activeTab && 'hidden md:block'}`}>
                        <div className="mb-10 block">
                            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight italic uppercase leading-none">Settings <span className="text-indigo-600">.</span></h1>
                            <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 dark:text-slate-500 mt-3">Personal Management Center</p>
                        </div>
                        <nav className="space-y-1">
                            {sidebarItems.map(item => (
                                <button
                                    key={item.id}
                                    onClick={() => setActiveTab(item.id as SettingsTab)}
                                    className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all duration-200 group ${activeTab === item.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-none font-bold' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`transition-transform duration-300 ${activeTab === item.id ? 'scale-110' : 'group-hover:scale-110'}`}>
                                            {item.icon}
                                        </div>
                                        <span className="text-xs uppercase tracking-widest font-black">{item.label}</span>
                                    </div>
                                    <svg className={`w-4 h-4 opacity-50 transition-transform ${activeTab === item.id ? 'translate-x-1' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
                                </button>
                            ))}
                        </nav>
                    </aside>

                    {/* Main Content */}
                    <main className={`flex-1 ${!activeTab && 'hidden md:block'} relative`}>
                        {activeTab && (
                            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                                {/* Mobile Header */}
                                <div className="md:hidden flex items-center gap-4 mb-8 border-b border-slate-100 dark:border-slate-800 pb-6">
                                    <button onClick={() => setActiveTab(null)} className="p-2 bg-slate-100 dark:bg-slate-900 rounded-xl active:scale-75 transition-transform"><svg className="w-6 h-6 text-slate-900 dark:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.5} d="M15 19l-7-7 7-7" /></svg></button>
                                    <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter">
                                        {sidebarItems.find(i => i.id === activeTab)?.label}
                                    </h2>
                                </div>

                                <div className="space-y-8">
                                    {activeTab === 'profile' && (
                                        <div className="space-y-12 pb-24">
                                            <IdentityCard 
                                                user={user} 
                                            />
                                            <EditProfileForm 
                                                form={profileForm} 
                                                setForm={setProfileForm} 
                                                onSubmit={handleProfileSubmit} 
                                                submitting={submitting} 
                                                user={user}
                                                defaults={siteDefaults}
                                                mascot={{ style: mascotStyle, setStyle: setMascotStyle, seed: mascotSeed, setSeed: setMascotSeed, bg: mascotBg, setBg: setMascotBg }}
                                            />
                                            
                                            {/* Floating Save Button */}
                                            <div className="fixed bottom-10 right-10 z-[100] animate-in zoom-in slide-in-from-bottom-10 duration-500">
                                                <button
                                                    onClick={() => handleProfileSubmit()}
                                                    disabled={submitting || profileForm.name.trim().length < 3}
                                                    className="group relative flex items-center justify-center gap-4 pl-14 pr-10 py-5 bg-indigo-600 hover:bg-slate-900 text-white rounded-[2rem] text-xs font-black uppercase tracking-[0.3em] shadow-[0_20px_50px_rgba(79,70,229,0.3)] hover:shadow-[0_20px_50px_rgba(15,23,42,0.3)] transition-all active:scale-95 disabled:opacity-50 disabled:scale-100"
                                                >
                                                    <div className="absolute left-3 w-9 h-9 bg-white/20 rounded-full flex items-center justify-center transition-transform group-hover:scale-110">
                                                        {submitting ? (
                                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                        ) : (
                                                            <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg>
                                                        )}
                                                    </div>
                                                    {submitting ? 'Syncing...' : 'SAVE'}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                    {activeTab === 'notifications' && <NotificationsSection prefs={prefs} updatePreference={updatePreference} saving={saving} />}
                                    {activeTab === 'circles' && <CirclesSection />}
                                    {activeTab === 'privacy' && <PrivacySection prefs={prefs} updatePreference={updatePreference} saving={saving} blockedUsers={blockedUsers} onUnblock={fetchUserData} phone={profileForm.phone} />}
                                    {activeTab === 'appearance' && <AppearanceSection theme={theme} setTheme={setTheme} prefs={prefs} updatePreference={updatePreference} saving={saving} user={user} />}
                                    {activeTab === 'account' && <AccountSection refreshUser={refreshUser} />}
                                </div>
                            </div>
                        )}
                        {!activeTab && (
                            <div className="hidden md:flex h-full items-center justify-center text-slate-300 dark:text-slate-700">
                                <p className="text-xs font-black uppercase tracking-[0.3em] italic">Select a category to manage</p>
                            </div>
                        )}
                    </main>
                </div>
            </div>
        </div>
    );
}

/* SECTION COMPONENTS */

function IdentityCard({ user }: any) {
    return (
        <div className="flex flex-col sm:flex-row items-center justify-between p-6 sm:p-10 bg-indigo-600 rounded-[2.5rem] sm:rounded-[3rem] text-white shadow-2xl relative overflow-hidden group gap-6 text-center sm:text-left">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl transition-transform duration-700 pointer-events-none" />
            <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8 relative z-10">
                {user?.profilePicture ? (
                    <div className="relative w-20 h-20 sm:w-24 sm:h-24 shrink-0">
                        <NextImage src={user.profilePicture} alt="Profile" fill className="rounded-3xl border-4 border-white/20 shadow-2xl object-cover" />
                    </div>
                ) : (
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl border-4 border-white/20 bg-white/10 flex items-center justify-center text-3xl font-black italic shadow-inner shrink-0">
                        {user?.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                )}
                <div className="flex flex-col items-center sm:items-start">
                    <div className="flex items-center gap-2">
                        <h3 className="text-2xl sm:text-3xl font-black italic tracking-tighter leading-none">@{user?.username}</h3>
                        {user?.isVerified && <svg className="w-6 h-6 text-indigo-300" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>}
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60 mt-2 sm:mt-3 italic">{user?.name}</p>
                </div>
            </div>
            <div className="hidden lg:block text-right relative z-10 opacity-30 select-none">
                <p className="text-4xl font-black opacity-10 uppercase tracking-tighter leading-none">Profile</p>
            </div>
        </div>
    );
}

function EditProfileForm({ form, setForm, onSubmit, submitting, user, defaults, mascot }: any) {
    const mascotUrl = `https://api.dicebear.com/9.x/${mascot.style}/svg?seed=${mascot.seed}&backgroundColor=${mascot.bg}`;

    const generateRandomMascot = () => {
        const randomSeed = Math.random().toString(36).substring(7);
        mascot.setSeed(randomSeed);
    };

    const mascotStyles = [
        { id: 'notionists', label: 'Minimal', icon: '🎨' },
        { id: 'adventurer', label: 'Playful', icon: '🤠' },
        { id: 'fun-emoji', label: 'Emoji', icon: '😊' },
        { id: 'bottts', label: 'Robot', icon: '🤖' },
        { id: 'pixel-art', label: 'Retro', icon: '👾' }
    ];

    const bgPalettes = [
        { lab: 'Ocean', val: 'b6e3f4,c0aede,d1d4f9' },
        { lab: 'Sunset', val: 'ffdfbf,ffd5dc,d1d4f9' },
        { lab: 'Forest', val: 'c0aede,ffd5dc,ffdfbf' },
        { lab: 'Candy', val: 'ffd5dc,ffdfbf,b6e3f4' }
    ];

    return (
        <form onSubmit={onSubmit} className="space-y-8 animate-in slide-in-from-bottom-4 duration-700">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 italic mb-2 ml-4">Edit Profile</h3>
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2rem] sm:rounded-[2.5rem] p-5 sm:p-10 shadow-sm space-y-12">
                
                {/* ─── Mascot Studio (Advanced Feature) ─── */}
                <div className="bg-indigo-600 rounded-[2rem] overflow-hidden shadow-2xl relative">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
                    <div className="absolute bottom-0 left-0 w-40 h-40 bg-indigo-400/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-xl" />
                    
                    <div className="relative z-10 p-6 sm:p-10 flex flex-col lg:flex-row items-center gap-10">
                        {/* Preview Circle */}
                        <div className="relative shrink-0 group">
                            <div className="absolute -inset-4 bg-white/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                            <div className="relative w-32 h-32 sm:w-40 sm:h-40 rounded-full border-4 border-white shadow-2xl overflow-hidden bg-white">
                                <NextImage 
                                    src={mascotUrl} 
                                    alt="Preview" 
                                    fill 
                                    unoptimized 
                                    className="object-cover" 
                                />
                            </div>
                            <button 
                                type="button"
                                onClick={generateRandomMascot}
                                className="absolute -bottom-2 -right-2 w-10 h-10 bg-white text-indigo-600 rounded-full flex items-center justify-center shadow-lg hover:rotate-180 transition-transform duration-500 active:scale-90"
                                title="Randomize Features"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                            </button>
                        </div>

                        {/* Controls */}
                        <div className="flex-1 space-y-6 text-center lg:text-left">
                            <div>
                                <h3 className="text-2xl font-black text-white italic tracking-tighter leading-none mb-2">Mascot Studio</h3>
                                <p className="text-indigo-100 text-xs font-bold opacity-80">Design your unique digital identity in seconds.</p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                {/* Styles */}
                                <div className="space-y-3 text-left">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-indigo-200/60 ml-1">Character Style</label>
                                    <div className="flex flex-wrap gap-2 justify-center lg:justify-start">
                                        {mascotStyles.map(s => (
                                            <button
                                                key={s.id}
                                                type="button"
                                                onClick={() => mascot.setStyle(s.id)}
                                                className={`px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${mascot.style === s.id ? 'bg-white text-indigo-600 shadow-lg' : 'bg-white/10 text-white hover:bg-white/20'}`}
                                            >
                                                {s.icon} {s.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Colors */}
                                <div className="space-y-3 text-left">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-indigo-200/60 ml-1">Theme Palette</label>
                                    <div className="flex flex-wrap gap-2 justify-center lg:justify-start">
                                        {bgPalettes.map(p => (
                                            <button
                                                key={p.lab}
                                                type="button"
                                                onClick={() => mascot.setBg(p.val)}
                                                className={`w-8 h-8 rounded-full border-2 transition-all active:scale-95 ${mascot.bg === p.val ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-60 hover:opacity-100'}`}
                                                style={{ background: `linear-gradient(135deg, #${p.val.split(',')[0]}, #${p.val.split(',')[2]})` }}
                                                title={p.lab}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => setForm((p:any) => ({ ...p, profilePicture: mascotUrl }))}
                                    className="w-full sm:w-auto px-8 py-3.5 bg-white text-indigo-600 rounded-[1.2rem] text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-indigo-50 active:scale-95 transition-all"
                                >
                                    ✨ Use as my Profile Picture
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ─── Avatar Selection ─── */}
                <div className="space-y-6">
                    <div className="flex items-center gap-3 ml-2">
                        <span className="text-xl">🎭</span>
                        <h4 className="text-xl font-black italic tracking-tighter text-slate-900 dark:text-white">Choose Your Avatar</h4>
                    </div>
                    
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 sm:gap-4 p-4 bg-slate-50 dark:bg-slate-950/50 rounded-[2rem] border border-slate-100 dark:border-slate-800/50">
                        {defaults.avatars?.map((url: string, idx: number) => (
                            <button
                                key={idx}
                                type="button"
                                onClick={() => setForm((p: any) => ({ ...p, profilePicture: url }))}
                                className={`relative aspect-square rounded-2xl overflow-hidden border-4 transition-all duration-300 transform active:scale-90 ${form.profilePicture === url ? 'border-indigo-600 scale-105 shadow-xl shadow-indigo-100 dark:shadow-none' : 'border-transparent hover:border-slate-200 dark:hover:border-slate-800'}`}
                            >
                                <NextImage src={url} alt={`Avatar ${idx}`} fill unoptimized={url.includes('dicebear')} className="object-cover" />
                                {form.profilePicture === url && (
                                    <div className="absolute inset-0 bg-indigo-600/10 flex items-center justify-center">
                                        <div className="bg-indigo-600 text-white p-1 rounded-full shadow-lg">
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg>
                                        </div>
                                    </div>
                                )}
                            </button>
                        ))}

                        {/* Custom Avatar Upload Button */}
                        <div className="flex flex-col items-center gap-4 group">
                            <div className="relative w-full aspect-square group cursor-pointer" onClick={() => (document.querySelector('input[type="file"]') as any)?.click()}>
                                <ImageUpload
                                    label=""
                                    folder="recircle/profiles"
                                    currentImage={!defaults.avatars.includes(form.profilePicture) ? form.profilePicture : ''}
                                    fallbackInitial=""
                                    onUpload={(url) => setForm((p: any) => ({ ...p, profilePicture: url }))}
                                    className="w-full h-full gap-0"
                                    imageClassName={`w-full h-full rounded-2xl border-4 transition-all ${!defaults.avatars.includes(form.profilePicture) ? 'border-indigo-600 shadow-xl' : 'border-dashed border-slate-200 dark:border-slate-800 group-hover:border-indigo-400'} object-cover`}
                                />
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <div className="bg-white/90 dark:bg-black/80 text-indigo-600 dark:text-white w-10 h-10 rounded-full shadow-2xl flex items-center justify-center border-4 border-white/50 dark:border-white/10 group-hover:scale-110 transition-transform">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M12 4v16m8-8H4" /></svg>
                                    </div>
                                </div>
                            </div>
                            <button 
                                type="button" 
                                className="w-full py-3 bg-indigo-600 dark:bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-indigo-700 transition shadow-lg shadow-indigo-100 dark:shadow-none"
                                onClick={() => (document.querySelector('input[type="file"]') as any)?.click()}
                            >
                                Upload Photo
                            </button>
                        </div>
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 ml-4 max-w-md">Pick a platform mascot or upload your own photo for a personal touch.</p>
                </div>

                {/* ─── Banner Selection ─── */}
                <div className="space-y-6">
                    <div className="flex items-center gap-3 ml-2">
                        <span className="text-xl">🖼️</span>
                        <h4 className="text-xl font-black italic tracking-tighter text-slate-900 dark:text-white">Profile Theme</h4>
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-slate-50 dark:bg-slate-950/50 rounded-[2rem] border border-slate-100 dark:border-slate-800/50">
                        {defaults.banners?.map((url: string, idx: number) => (
                            <button
                                key={idx}
                                type="button"
                                onClick={() => setForm((p: any) => ({ ...p, bannerImage: url }))}
                                className={`relative h-20 sm:h-24 rounded-2xl overflow-hidden border-4 transition-all duration-300 transform active:scale-95 ${form.bannerImage === url ? 'border-indigo-600 scale-[1.02] shadow-xl shadow-indigo-100 dark:shadow-none' : 'border-transparent hover:border-slate-200 dark:hover:border-slate-800'}`}
                            >
                                <NextImage src={url} alt={`Banner ${idx}`} fill className="object-cover" />
                                {form.bannerImage === url && (
                                    <div className="absolute inset-0 bg-indigo-600/10 flex items-center justify-center">
                                        <div className="bg-indigo-600 text-white p-1 rounded-full shadow-lg">
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg>
                                        </div>
                                    </div>
                                )}
                            </button>
                        ))}

                        {/* Custom Banner Upload Button */}
                        <div className="flex flex-col items-center gap-4 group">
                            <div className="relative w-full h-20 sm:h-24 group cursor-pointer" onClick={() => (document.querySelectorAll('input[type="file"]')[1] as any)?.click()}>
                                <ImageUpload
                                    label=""
                                    folder="recircle/profiles"
                                    currentImage={!defaults.banners.includes(form.bannerImage) ? form.bannerImage : ''}
                                    fallbackInitial=""
                                    onUpload={(url) => setForm((p: any) => ({ ...p, bannerImage: url }))}
                                    className="w-full h-full gap-0"
                                    imageClassName={`w-full h-full rounded-2xl border-4 transition-all ${!defaults.banners.includes(form.bannerImage) ? 'border-indigo-600 shadow-xl' : 'border-dashed border-slate-200 dark:border-slate-800 group-hover:border-indigo-400'} object-cover`}
                                />
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <div className="bg-white/90 dark:bg-black/80 text-indigo-600 dark:text-white w-10 h-10 rounded-full shadow-2xl flex items-center justify-center border-4 border-white/50 dark:border-white/10 group-hover:scale-110 transition-transform">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M12 4v16m8-8H4" /></svg>
                                    </div>
                                </div>
                            </div>
                            <button 
                                type="button" 
                                className="w-full py-3 bg-indigo-600 dark:bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-indigo-700 transition shadow-lg shadow-indigo-100 dark:shadow-none"
                                onClick={() => (document.querySelectorAll('input[type="file"]')[1] as any)?.click()}
                            >
                                Upload Banner
                            </button>
                        </div>
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 ml-4 max-w-md">Select a curated theme or upload a custom background to style your shop.</p>
                </div>

                <div className="h-px bg-slate-50 dark:bg-slate-800/50 w-full" />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
                    <div className="space-y-3">
                        <div className="flex justify-between items-center ml-2">
                             <label className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600/60 italic">Full Name</label>
                             <span className={`text-[9px] font-black uppercase tracking-widest italic ${form.name.length < 3 || form.name.length > 30 ? 'text-rose-400' : 'text-slate-300'}`}>{form.name.length} / 30</span>
                        </div>
                        <input type="text" required value={form.name} minLength={3} maxLength={30} onChange={(e) => setForm((p:any) => ({ ...p, name: e.target.value }))} className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-2xl py-4 px-5 text-[11px] font-black outline-none focus:ring-2 focus:ring-indigo-200 transition-all text-slate-900 dark:text-white" />
                    </div>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center ml-2">
                             <label className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600/60 italic">Username</label>
                             <div className="flex gap-3">
                                <span className={`text-[9px] font-black uppercase tracking-widest italic ${form.username.length > 20 ? 'text-rose-400' : 'text-slate-300'}`}>{form.username.length} / 20</span>
                                <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">{3 - (user?.usernameChangeCount || 0)} left</span>
                             </div>
                        </div>
                        <div className="relative">
                            <span className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-indigo-500">@</span>
                            <input type="text" value={form.username} maxLength={20} disabled={(user?.usernameChangeCount || 0) >= 3} onChange={(e) => setForm((p:any) => ({ ...p, username: e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, '').trim() }))} className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-2xl py-4 pl-12 pr-5 text-[11px] font-black outline-none focus:ring-2 focus:ring-indigo-200 transition-all disabled:opacity-50 text-slate-900 dark:text-white" />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
                    <div className="space-y-3">
                        <div className="flex justify-between items-center ml-2">
                             <label className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600/60 italic">Phone Number</label>
                             <span className={`text-[9px] font-black uppercase tracking-widest italic ${form.phone.length !== 10 && form.phone.length !== 0 ? 'text-amber-500' : 'text-slate-300'}`}>{form.phone.length} / 10</span>
                        </div>
                        <input type="tel" value={form.phone} onChange={(e) => setForm((p:any) => ({ ...p, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))} className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-2xl py-4 px-5 text-[11px] font-black outline-none focus:ring-2 focus:ring-indigo-200 transition-all text-slate-900 dark:text-white" placeholder="Optional 10-digit number" />
                    </div>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center ml-2">
                             <label className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600/60 italic">Location State</label>
                             <span className={`text-[9px] font-black uppercase tracking-widest italic ${form.address.length > 150 ? 'text-rose-400' : 'text-slate-300'}`}>{form.address.length} / 150</span>
                        </div>
                        <input type="text" value={form.address} maxLength={150} onChange={(e) => setForm((p:any) => ({ ...p, address: e.target.value }))} className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-2xl py-4 px-5 text-[11px] font-black outline-none focus:ring-2 focus:ring-indigo-200 transition-all text-slate-900 dark:text-white" placeholder="City, State" />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
                    <div className="md:col-span-2 space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600/60 ml-2 italic">Professional Bio</label>
                        <textarea rows={4} maxLength={500} value={form.bio} onChange={(e) => setForm((p:any) => ({ ...p, bio: e.target.value }))} className="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-[1.5rem] py-5 px-6 text-[11px] font-bold outline-none focus:ring-2 focus:ring-indigo-200 transition-all leading-relaxed text-slate-900 dark:text-white" />
                        <p className="text-right text-[9px] font-black text-slate-300 uppercase tracking-widest italic">{form.bio.length} / 500</p>
                    </div>
                    <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600/60 ml-2 italic">Gender</label>
                        <div className="grid grid-cols-2 gap-2">
                            {['none', 'male', 'female', 'other'].map(g => (
                                <button key={g} type="button" onClick={() => setForm((p:any) => ({ ...p, gender: g }))} className={`py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${form.gender === g ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-50 dark:bg-slate-900/50 text-slate-400 border border-slate-100 dark:border-slate-800'}`}>{g}</button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </form>
    );
}

function NotificationsSection({ prefs, updatePreference, saving }: any) {
    return (
        <div className="space-y-4 animate-in fade-in duration-700">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 italic mb-6 ml-4">Notification Control</h3>
            <div className="grid grid-cols-1 gap-4">
                <ToggleRow title="Chat Pings" desc="Native alerts for direct messages." checked={prefs.notifyMessages} onChange={(v:any) => updatePreference('notifyMessages', v)} loading={saving === 'notifyMessages'} />
                <ToggleRow title="Marketplace Pings" desc="Alerts for buy/rent/service offers on your items." checked={prefs.notifyOffers} onChange={(v:any) => updatePreference('notifyOffers', v)} loading={saving === 'notifyOffers'} />
                <ToggleRow title="Newsletter" desc="Weekly summaries of top deals and campus highlights." checked={prefs.notifyNewsletter} onChange={(v:any) => updatePreference('notifyNewsletter', v)} loading={saving === 'notifyNewsletter'} />
                <ToggleRow title="Community Pings" desc="Announcements from your verified circles." checked={prefs.notifyCommunity} onChange={(v:any) => updatePreference('notifyCommunity', v)} loading={saving === 'notifyCommunity'} />
                <ToggleRow title="Security Alerts" desc="Critical pings for account safety and new logins." checked={prefs.notifySecurity} onChange={(v:any) => updatePreference('notifySecurity', v)} loading={saving === 'notifySecurity'} />
            </div>
        </div>
    );
}

function CirclesSection() {
    return <div className="space-y-6 animate-in fade-in duration-700"><CommunityManager /></div>;
}

function PrivacySection({ prefs, updatePreference, saving, blockedUsers, onUnblock, phone }: any) {
    const isPhoneEmpty = !phone || phone.trim() === '';
    
    return (
        <div className="space-y-4 animate-in fade-in duration-700">
            <div className="grid grid-cols-1 gap-4">
                <ToggleRow title="Email Privacy" desc="Show email on your member profile." checked={prefs.allowEmailContact} onChange={(v:any) => updatePreference('allowEmailContact', v)} loading={saving === 'allowEmailContact'} />
                <ToggleRow 
                    title="Phone Privacy" 
                    desc={isPhoneEmpty ? "No phone number set. Update your profile first." : "Visible ONLY to verified members."} 
                    checked={isPhoneEmpty ? false : prefs.allowPhoneContact} 
                    onChange={(v:any) => updatePreference('allowPhoneContact', v)} 
                    loading={saving === 'allowPhoneContact'} 
                    disabled={isPhoneEmpty}
                />
                <ToggleRow title="Active Bubble" desc="Show a green live presence dot." checked={prefs.showOnlineStatus} onChange={(v:any) => updatePreference('showOnlineStatus', v)} loading={saving === 'showOnlineStatus'} />
                <ToggleRow title="Vacation Mode" desc="Archive and hide all fixed listings." checked={prefs.isOnVacation} onChange={(v:any) => updatePreference('isOnVacation', v)} loading={saving === 'isOnVacation'} color="amber" />
            </div>
            {blockedUsers.length > 0 && (
                <div className="mt-8 p-6 sm:p-8 bg-slate-50 dark:bg-slate-900/40 rounded-[2rem] sm:rounded-[2.5rem] border border-slate-100 dark:border-slate-800">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6 italic">Blocked Members ({blockedUsers.length})</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {blockedUsers.map((u:any) => (
                            <div key={u._id} className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                                <span className="text-[10px] font-black truncate px-2 text-slate-900 dark:text-white">@{u.username}</span>
                                <button onClick={async () => { await fetch(`/api/user/block?userId=${u._id}`, { method: 'DELETE' }); onUnblock(); }} className="text-[9px] font-black uppercase text-rose-500 hover:text-rose-600 px-2 tracking-widest italic transition-colors">Free</button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function AppearanceSection({ theme, setTheme, prefs, updatePreference, saving, user }: any) {
    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <div className="grid grid-cols-3 gap-3 sm:gap-4">
                <ThemeButton active={theme === 'light'} onClick={() => setTheme('light')} lab="Light" emoji="☀️" />
                <ThemeButton active={theme === 'dark'} onClick={() => setTheme('dark')} lab="Dark" emoji="🌌" />
                <ThemeButton active={theme === 'system'} onClick={() => setTheme('system')} lab="Auto" emoji="💻" />
            </div>
            <div className="p-6 sm:p-8 bg-white dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800 rounded-[2rem] sm:rounded-[2.5rem] shadow-sm">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic mb-6">Landing Circle</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 items-start">
                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600/60 ml-2 italic">Default Feed</label>
                        <div className="relative group">
                            <select value={prefs.defaultCommunity} onChange={(e) => updatePreference('defaultCommunity', e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 px-4 py-3.5 pr-10 rounded-2xl border-none text-[11px] font-black outline-none focus:ring-2 focus:ring-indigo-200 appearance-none text-slate-900 dark:text-white">
                                <option value="" className="bg-white dark:bg-slate-900">🌏 Unified Feed</option>
                                {user?.verifiedCommunities?.map((c: any) => <option key={c._id} value={c._id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">{c.name}</option>)}
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg></div>
                        </div>
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className={`text-[10px] font-black uppercase tracking-[0.2em] ml-2 italic ${!prefs.defaultCommunity ? 'text-slate-300 dark:text-slate-700' : 'text-indigo-600/60'}`}>Home Building/Hostel</label>
                        <div className={`relative group transition-opacity duration-300 ${!prefs.defaultCommunity ? 'opacity-50 pointer-events-none' : ''}`}>
                            <select value={prefs.defaultHostel} onChange={(e) => updatePreference('defaultHostel', e.target.value)} disabled={!prefs.defaultCommunity} className={`w-full px-4 py-3.5 pr-10 rounded-2xl border-none text-[11px] font-black outline-none focus:ring-2 focus:ring-indigo-200 transition-all appearance-none ${!prefs.defaultCommunity ? 'bg-slate-50 dark:bg-slate-950 text-slate-400 cursor-not-allowed' : 'bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400'}`}>
                                <option value="" className="bg-white dark:bg-slate-900">{!prefs.defaultCommunity ? 'Select Community First' : 'All Areas'}</option>
                                {user?.verifiedCommunities?.find((c: any) => c._id === prefs.defaultCommunity)?.hostels?.map((h: string) => <option key={h} value={h} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">{h}</option>)}
                            </select>
                            <div className={`absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none transition-colors ${!prefs.defaultCommunity ? 'text-slate-300 dark:text-slate-700' : 'text-indigo-400'}`}><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg></div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="p-6 sm:p-8 bg-white dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800 rounded-[2rem] sm:rounded-[2.5rem] shadow-sm">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic mb-6">Visual Experience</h3>
                <ToggleRow title="Grid Density" desc="High-density 5-column layout on PC." checked={prefs.compactView} onChange={(v:any) => updatePreference('compactView', v)} loading={saving === 'compactView'} />
            </div>
        </div>
    );
}

function AccountSection({ refreshUser }: any) {
    const handleDelete = async () => {
        const confirmed = await confirmAction({ title: 'Wipe Account?', text: 'This is permanent. All history will be lost.', dangerMode: true, confirmButtonText: 'Yes, Delete Everything' });
        if (confirmed) {
            const res = await fetch('/api/profile/data', { method: 'DELETE' });
            if (res.ok) window.location.href = '/';
        }
    };
    return (
        <div className="flex flex-col md:flex-row gap-4 animate-in fade-in duration-700">
             <div className="flex-1 p-6 sm:p-10 bg-blue-50/50 dark:bg-blue-900/10 border-2 border-dashed border-blue-100 dark:border-blue-900/30 rounded-[2.5rem] sm:rounded-[3rem] text-center">
                <h4 className="text-xl sm:text-2xl font-black italic tracking-tighter mb-4 text-blue-900 dark:text-blue-400">Technical Support</h4>
                <Link href={`mailto:${siteConfig.supportEmail}`} className="inline-block px-10 py-3.5 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-blue-200 dark:shadow-none hover:scale-105 active:scale-95 transition-all">Submit Ticket</Link>
             </div>
             <div className="flex-1 p-6 sm:p-10 bg-rose-50/50 dark:bg-rose-950/10 border-2 border-dashed border-rose-100 dark:border-rose-900/30 rounded-[2.5rem] sm:rounded-[3rem] text-center">
                <h4 className="text-xl sm:text-2xl font-black italic tracking-tighter mb-4 text-rose-900 dark:text-rose-400">Destruction Zone</h4>
                <button onClick={handleDelete} className="px-10 py-3.5 border-2 border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-rose-600 hover:text-white hover:border-rose-600 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all active:scale-95">Permanent Delete</button>
             </div>
        </div>
    );
}

/* UI UTILS */

function ToggleRow({ title, desc, checked, onChange, loading, color = 'indigo', disabled = false }: any) {
    const c = color === 'indigo' ? 'peer-checked:bg-indigo-600' : 'peer-checked:bg-amber-500';
    return (
        <label className={`flex items-center justify-between p-4 sm:p-6 bg-white dark:bg-slate-900/60 rounded-[1.5rem] sm:rounded-[2rem] border border-slate-100 dark:border-slate-800 transition-all group ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-indigo-100 dark:hover:border-indigo-900'}`}>
            <div className="pr-4 pointer-events-none">
                <span className={`text-[10px] font-black uppercase tracking-widest block mb-1 italic transition-colors ${disabled ? 'text-slate-300' : 'text-slate-400 group-hover:text-indigo-600'}`}>{title}</span>
                <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">{desc}</p>
            </div>
            <div className="relative inline-flex items-center flex-shrink-0">
                <input type="checkbox" className="sr-only peer" checked={checked} onChange={(e) => onChange(e.target.checked)} disabled={loading || disabled} />
                <div className={`w-12 h-6.5 bg-slate-200 dark:bg-slate-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:rounded-full after:h-[18px] after:w-[18px] after:transition-all ${c}`}></div>
            </div>
        </label>
    );
}

function ThemeButton({ active, onClick, lab, emoji }: any) {
    return (
        <button onClick={onClick} className={`flex flex-col items-center justify-center p-4 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border-2 transition-all active:scale-95 ${active ? 'border-indigo-600 bg-white dark:bg-slate-900 shadow-xl shadow-indigo-100 dark:shadow-none font-bold' : 'border-transparent bg-slate-50 dark:bg-slate-900/30 text-slate-400 hover:border-slate-200 dark:hover:border-slate-800 font-bold'}`}>
            <span className="text-3xl sm:text-4xl mb-3 transition-transform duration-500 group-hover:scale-125">{emoji}</span>
            <span className={`text-[10px] font-black uppercase tracking-widest ${active ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}>{lab}</span>
        </button>
    );
}

const ProfileIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;
const NotificationIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>;
const CircleIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>;
const PrivacyIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m0-6V9m0 12a9 9 0 110-18 9 9 0 010 18z" /></svg>;
const AppearanceIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a1.5 1.5 0 011.5 1.5V17a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>;
const AccountIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924-1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
