'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from 'next-themes';
import Loader from '@/components/Loader';
import { showError, showSuccess } from '@/lib/confirm';

// Sub-components
import EditProfileForm from '@/components/settings/EditProfileForm';
import { 
    NotificationsSection, 
    CirclesSection, 
    PrivacySection, 
    AppearanceSection, 
    AccountSection 
} from '@/components/settings/SettingsSections';

export default function SettingsPage() {
    const { user, loading: authLoading, refreshUser } = useAuth();
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('profile');
    const [saving, setSaving] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [blockedUsers, setBlockedUsers] = useState([]);

    // Profile State
    const [profileForm, setProfileForm] = useState({
        name: '',
        username: '',
        bio: '',
        phone: '',
        address: '',
        gender: 'none',
        profilePicture: '',
        bannerImage: '',
    });

    // Preferences State
    const [prefs, setPrefs] = useState({
        allowEmailContact: false,
        allowPhoneContact: false,
        notifyOffers: true,
        notifyMessages: true,
        isOnVacation: false,
        showOnlineStatus: true,
        compactView: false,
        defaultCommunity: '',
        defaultHostel: '',
    });

    // Mascot Customizer State
    const [mascotStyle, setMascotStyle] = useState('notionists');
    const [mascotSeed, setMascotSeed] = useState(user?.username || 'ReCircle');
    const [mascotBg, setMascotBg] = useState('b6e3f4,c0aede,d1d4f9');

    // Default Assets
    const [defaults, setDefaults] = useState({ avatars: [], banners: [] });

    useEffect(() => {
        setMounted(true);
        if (user) fetchUserData();
    }, [user]);

    const fetchUserData = async () => {
        try {
            const res = await fetch('/api/profile/data');
            if (res.ok) {
                const { user: u, configData } = await res.json();
                setProfileForm({
                    name: u.name,
                    username: u.username,
                    bio: u.bio || '',
                    phone: u.phone || '',
                    address: u.address || '',
                    gender: u.gender || 'none',
                    profilePicture: u.profilePicture || '',
                    bannerImage: u.bannerImage || '',
                });
                setPrefs({
                    allowEmailContact: !!u.allowEmailContact,
                    allowPhoneContact: !!u.allowPhoneContact,
                    notifyOffers: !!u.notifyOffers,
                    notifyMessages: !!u.notifyMessages,
                    isOnVacation: !!u.isOnVacation,
                    showOnlineStatus: !!u.showOnlineStatus,
                    compactView: !!u.compactView,
                    defaultCommunity: u.defaultCommunity?._id || u.defaultCommunity || '',
                    defaultHostel: u.defaultHostel || '',
                });
                setDefaults({
                    avatars: configData?.defaultAvatars || [],
                    banners: configData?.defaultBanners || [],
                });
            }
            
            const blockRes = await fetch('/api/user/blocked');
            if (blockRes.ok) {
                const blockData = await blockRes.json();
                setBlockedUsers(blockData.blockedUsers || []);
            }
        } catch (error) {
            console.error('Failed to fetch user data:', error);
        } finally {
            setLoading(false);
        }
    };

    const updatePreference = async (field: string, value: any) => {
        setSaving(field);
        const updateData = { [field]: value };
        
        // Optimistic update
        setPrefs(prev => ({ ...prev, [field]: value }));

        try {
            const res = await fetch('/api/profile/data', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updateData),
            });
            if (res.ok) await refreshUser();
            else throw new Error();
        } catch {
            showError('Save Error', 'Failed to update preference');
            fetchUserData(); // Revert on error
        } finally {
            setTimeout(() => setSaving(null), 400);
        }
    };

    const handleProfileSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const res = await fetch('/api/profile/data', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(profileForm),
            });
            if (res.ok) {
                showSuccess('Success', 'Profile updated correctly.');
                await refreshUser();
                fetchUserData();
            } else {
                const data = await res.json();
                showError('Error', data.error || 'Update failed');
            }
        } catch {
            showError('Error', 'Network error.');
        } finally {
            setSubmitting(false);
        }
    };

    if (authLoading || loading || !mounted) return <Loader />;

    const tabs = [
        { id: 'profile', label: 'Profile', icon: '👤' },
        { id: 'notifications', label: 'Alerts', icon: '🔔' },
        { id: 'circles', label: 'Circles', icon: '🤝' },
        { id: 'privacy', label: 'Privacy', icon: '🛡️' },
        { id: 'appearance', label: 'Theme', icon: '🎨' },
        { id: 'account', label: 'Settings', icon: '⚙️' },
    ];

    return (
        <div className="min-h-screen bg-[#FDFDFD] dark:bg-[#0A0A0A] pb-24 md:pb-12 transition-colors duration-500">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-16">
                
                {/* Header Section */}
                <div className="flex flex-col md:flex-row gap-10 mb-12">
                    <div className="w-full md:w-64 shrink-0">
                        <h1 className="text-4xl font-black italic tracking-tighter text-slate-900 dark:text-white mb-8">Settings</h1>
                        
                        {/* Tab Navigation */}
                        <div className="flex md:flex-col gap-2 overflow-x-auto pb-4 md:pb-0 scrollbar-hide">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-4 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                                        activeTab === tab.id 
                                        ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-200 dark:shadow-none' 
                                        : 'bg-white dark:bg-slate-900 text-slate-400 hover:bg-indigo-50 dark:hover:bg-slate-800'
                                    }`}
                                >
                                    <span className="text-lg">{tab.icon}</span>
                                    <span>{tab.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Main Content Area */}
                    <div className="flex-1 min-w-0">
                        <SettingsHeader user={user} />
                        
                        {activeTab === 'profile' && (
                            <div className="space-y-8">
                                <EditProfileForm 
                                    form={profileForm} 
                                    setForm={setProfileForm} 
                                    onSubmit={handleProfileSubmit} 
                                    submitting={submitting} 
                                    user={user} 
                                    defaults={defaults}
                                    mascot={{
                                        style: mascotStyle, setStyle: setMascotStyle,
                                        seed: mascotSeed, setSeed: setMascotSeed,
                                        bg: mascotBg, setBg: setMascotBg
                                    }}
                                />
                                {/* Bottom Action Bar for Profile */}
                                <div className="fixed bottom-20 left-0 right-0 p-4 md:relative md:bottom-0 md:p-0 z-40">
                                    <button 
                                        onClick={handleProfileSubmit}
                                        disabled={submitting}
                                        className="w-full md:w-auto px-12 py-5 bg-indigo-600 text-white rounded-3xl font-black uppercase tracking-widest shadow-2xl shadow-indigo-600/30 hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-3"
                                    >
                                        {submitting ? 'Saving Changes...' : 'Save Profile Details'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {activeTab === 'notifications' && (
                            <NotificationsSection prefs={prefs} updatePreference={updatePreference} saving={saving} />
                        )}

                        {activeTab === 'circles' && <CirclesSection />}

                        {activeTab === 'privacy' && (
                            <PrivacySection 
                                prefs={prefs} 
                                updatePreference={updatePreference} 
                                saving={saving} 
                                blockedUsers={blockedUsers} 
                                onUnblock={fetchUserData}
                                phone={profileForm.phone}
                            />
                        )}

                        {activeTab === 'appearance' && (
                            <AppearanceSection 
                                theme={theme} 
                                setTheme={setTheme} 
                                prefs={prefs} 
                                updatePreference={updatePreference} 
                                saving={saving} 
                                user={user} 
                            />
                        )}

                        {activeTab === 'account' && <AccountSection />}
                    </div>
                </div>
            </div>
        </div>
    );
}

function SettingsHeader({ user }: any) {
    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mb-12 bg-slate-900 text-white p-8 sm:p-12 rounded-[2.5rem] sm:rounded-[3rem] overflow-hidden relative shadow-2xl">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
            <div className="flex flex-col sm:flex-row items-center gap-6 relative z-10">
                {user?.profilePicture ? (
                    <div className="relative w-20 h-20 sm:w-24 sm:h-24 shrink-0">
                        <img src={user.profilePicture} alt="Profile" className="w-full h-full rounded-3xl border-4 border-white/20 shadow-2xl object-cover" />
                    </div>
                ) : (
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl border-4 border-white/20 bg-white/10 flex items-center justify-center text-3xl font-black italic shadow-inner shrink-0">
                        {user?.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                )}
                <div className="flex flex-col items-center sm:items-start">
                    <div className="flex items-center gap-2">
                        <h3 className="text-2xl sm:text-3xl font-black italic tracking-tighter leading-none">@{user?.username}</h3>
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
