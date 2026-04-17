'use client';

import { useState, useEffect } from 'react';
import Loader from '@/components/Loader';
import { confirmAction, showError, showSuccess } from '@/lib/confirm';
import ImageUpload from '@/components/ImageUpload';
import NextImage from 'next/image';

interface BanRule { reportThreshold: number; banDays: number; }

interface Settings {
    autoBanRules: BanRule[];
    autoBanEnabled: boolean;
    productCategories: string[];
    serviceCategories: string[];
    serviceAvailability: string[];
    productConditions: string[];
    maxProductImages: number;
    maxServiceImages: number;
    maxPriceProduct: number;
    maxPriceService: number;
    minPrice: number;
    apiRateLimitGeneral: number;
    apiRateLimitAuth: number;
    maintenanceMode: boolean;
    newRegistrationsEnabled: boolean;
    newListingsEnabled: boolean;
    banEmailEnabled: boolean;
    otpEmailEnabled: boolean;
    maxReportOtherChars: number;
    maxReviewChars: number;
    maxOfferMessageChars: number;
    maxBoardPostChars: number;
    maxBoardReplyChars: number;
    maxSearchChars: number;
    autoRemoveThreshold: number;
    defaultAvatars: string[];
    defaultBanners: string[];

    // Detailed Rate Limits (Dynamic)
    loginMaxAttempts: number;
    loginLockoutMins: number;
    otpSendCooldownSecs: number;
    otpVerifyMaxAttempts: number;
    otpVerifyLockoutMins: number;
    ipLimitLoginPerHour: number;
    ipLimitRegisterPerHour: number;
    ipLimitOtpSendPerHour: number;
    ipLimitOtpVerifyPerHour: number;
    ipLimitCheckEmailPerHour: number;
    ipLimitResetPasswordPerHour: number;

    maxOtpPerEmailPerHour: number;
    globalDailyOtpLimit: number;
    activeSmtpIndex: number;
}

type Tab = 'moderation' | 'categories' | 'visuals' | 'limits' | 'platform' | 'email' | 'security';

export default function AdminSettingsPage() {
    const [settings, setSettings] = useState<Settings | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [usage, setUsage] = useState<{ sentInLast24h: number, smtp1Sent: number, smtp2Sent: number, smtp3Sent: number } | null>(null);
    const [activeTab, setActiveTab] = useState<Tab | null>(null);
    const [dirty, setDirty] = useState(false);

    // Temp state for adding new items
    const [newBanThreshold, setNewBanThreshold] = useState('');
    const [newBanDays, setNewBanDays] = useState('');
    const [newProductCat, setNewProductCat] = useState('');
    const [newServiceCat, setNewServiceCat] = useState('');
    const [newServiceAvailability, setNewServiceAvailability] = useState('');
    const [newCondition, setNewCondition] = useState('');
    const [newAvatar, setNewAvatar] = useState('');
    const [newBanner, setNewBanner] = useState('');

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/admin/settings');
            if (!res.ok) throw new Error('Failed to load settings');
            const data = await res.json();
            setSettings(data.settings);
            setUsage(data.usage);
        } catch (err: any) {
            showError('Load Error', err.message);
        } finally {
            setLoading(false);
        }
    };

    const saveSettings = async () => {
        if (!settings) return;
        const confirmed = await confirmAction({
            title: 'Save Changes?',
            text: 'This will update the live platform settings immediately.',
            confirmButtonText: 'Save Settings'
        });
        if (!confirmed) return;

        setSaving(true);
        try {
            const res = await fetch('/api/admin/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to save');
            }
            const data = await res.json();
            setSettings(data.settings);
            setUsage(data.usage);
            setDirty(false);
            showSuccess('Settings Saved', 'All platform settings have been updated successfully.');
        } catch (err: any) {
            showError('Save Failed', err.message);
        } finally {
            setSaving(false);
        }
    };

    const update = (patch: Partial<Settings>) => {
        setSettings(prev => prev ? { ...prev, ...patch } : prev);
        setDirty(true);
    };

    // Ban rules
    const addBanRule = () => {
        const threshold = parseInt(newBanThreshold);
        const days = parseInt(newBanDays);
        if (!threshold || !days || threshold < 1 || days < 1) return;
        if (settings?.autoBanRules.some(r => r.reportThreshold === threshold)) {
            showError('Duplicate', `A rule for ${threshold} reports already exists.`);
            return;
        }
        const newRules = [...(settings?.autoBanRules || []), { reportThreshold: threshold, banDays: days }]
            .sort((a, b) => a.reportThreshold - b.reportThreshold);
        update({ autoBanRules: newRules });
        setNewBanThreshold('');
        setNewBanDays('');
    };

    const removeBanRule = (idx: number) => {
        const newRules = settings!.autoBanRules.filter((_, i) => i !== idx);
        update({ autoBanRules: newRules });
    };

    // Category helpers
    const addItem = (field: 'productCategories' | 'serviceCategories' | 'serviceAvailability' | 'productConditions' | 'defaultAvatars' | 'defaultBanners', value: string, setter: (v: string) => void) => {
        const trimmed = value.trim();
        if (!trimmed) return;
        const list = settings![field];
        if (list.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
            showError('Duplicate', `"${trimmed}" already exists.`);
            return;
        }
        update({ [field]: [...list, trimmed] } as any);
        setter('');
    };

    const removeItem = (field: 'productCategories' | 'serviceCategories' | 'serviceAvailability' | 'productConditions' | 'defaultAvatars' | 'defaultBanners', idx: number) => {
        const list = settings![field].filter((_, i) => i !== idx);
        if (list.length === 0) {
            showError('Cannot Remove', 'At least one item must remain.');
            return;
        }
        update({ [field]: list } as any);
    };

    if (loading) return <Loader />;
    if (!settings) return <div className="max-w-4xl mx-auto mt-12 p-6 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-2xl border border-red-200 dark:border-red-800"><h2 className="text-xl font-bold">Failed to load settings</h2></div>;

    const tabs: { id: Tab; label: string; icon: string }[] = [
        { id: 'moderation', label: 'Moderation', icon: '🛡️' },
        { id: 'categories', label: 'Categories', icon: '🏷️' },
        { id: 'visuals', label: 'Visuals', icon: '🎨' },
        { id: 'limits', label: 'Limits', icon: '📏' },
        { id: 'platform', label: 'Platform', icon: '⚙️' },
        { id: 'email', label: 'Email', icon: '📧' },
        { id: 'security', label: 'Security', icon: '🛡️' },
    ];

    return (
        <div className="min-h-screen bg-[#FDFDFD] dark:bg-[#0A0A0A] transition-colors duration-500">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-16">
                
                {settings.maintenanceMode && (
                    <div className="mb-8 bg-red-600/10 dark:bg-red-500/10 border-l-4 border-red-600 dark:border-red-500 p-4 rounded-r-2xl flex items-start sm:items-center gap-4 animate-in slide-in-from-top-4">
                        <span className="text-2xl animate-pulse">🚨</span>
                        <div>
                            <h3 className="text-red-800 dark:text-red-400 font-black tracking-widest uppercase text-sm">Maintenance Mode Active</h3>
                            <p className="text-red-700/80 dark:text-red-400/80 text-xs font-bold mt-0.5">The platform is currently offline for non-admins. Users will see a maintenance screen until you disable this in Platform Settings.</p>
                        </div>
                    </div>
                )}

                <div className="flex flex-col md:flex-row gap-10">
                    {/* Sidebar Navigation */}
                    <aside className={`w-full md:w-64 shrink-0 ${activeTab && 'hidden md:block'}`}>
                        <div className="mb-10 block">
                            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight italic uppercase leading-none">Admin <span className="text-indigo-600">.</span></h1>
                            <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 dark:text-slate-500 mt-3">Platform Settings</p>
                        </div>
                        <nav className="space-y-1">
                            {tabs.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all duration-200 group ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-none font-bold' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`transition-transform duration-300 ${activeTab === tab.id ? 'scale-110' : 'group-hover:scale-110'}`}>
                                            <span className="text-base">{tab.icon}</span>
                                        </div>
                                        <span className="text-xs uppercase tracking-widest font-black">{tab.label}</span>
                                    </div>
                                    <svg className={`w-4 h-4 opacity-50 transition-transform ${activeTab === tab.id ? 'translate-x-1' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
                                </button>
                            ))}
                        </nav>

                        <div className="mt-10">
                            <button
                                onClick={saveSettings}
                                disabled={saving || !dirty}
                                className={`w-full py-4 rounded-[1.5rem] text-[10px] uppercase tracking-widest font-black transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${
                                    dirty ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-200 dark:shadow-none animate-pulse' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                                }`}
                            >
                                {saving ? 'Saving...' : dirty ? '● Save Changes' : 'Saved ✓'}
                            </button>
                        </div>
                    </aside>

                    <main className={`flex-1 min-w-0 ${!activeTab && 'hidden md:block'}`}>
                        {activeTab && (
                            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                                <div className="md:hidden flex items-center gap-4 mb-8 border-b border-slate-100 dark:border-slate-800 pb-6">
                                    <button onClick={() => setActiveTab(null)} className="p-2 bg-slate-100 dark:bg-slate-900 rounded-xl active:scale-75 transition-transform"><svg className="w-6 h-6 text-slate-900 dark:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.5} d="M15 19l-7-7 7-7" /></svg></button>
                                    <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter">
                                        {tabs.find(i => i.id === activeTab)?.label}
                                    </h2>
                                </div>

            {/* ═══════════════════════ MODERATION TAB ═══════════════════════ */}
            {activeTab === 'moderation' && (
                <div className="space-y-8 animate-in fade-in duration-300">
                    {/* Auto-Ban Toggle */}
                    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 sm:p-8">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-xl font-black text-gray-900 dark:text-white">Auto-Ban System</h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Automatically ban users who receive too many unique community reports.</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" className="sr-only peer" checked={settings.autoBanEnabled} onChange={e => update({ autoBanEnabled: e.target.checked })} />
                                <div className="w-14 h-7 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-indigo-600 dark:peer-checked:bg-indigo-500"></div>
                            </label>
                        </div>

                        {/* Ban Rules Table */}
                        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                            <div className="grid grid-cols-12 gap-2 px-4 sm:px-6 py-3 bg-gray-100 dark:bg-gray-800 text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">
                                <div className="col-span-1 text-center">#</div>
                                <div className="col-span-4">Report Threshold</div>
                                <div className="col-span-4">Ban Duration</div>
                                <div className="col-span-3 text-right">Action</div>
                            </div>
                            {settings.autoBanRules.map((rule, idx) => (
                                <div key={idx} className="grid grid-cols-12 gap-2 px-4 sm:px-6 py-4 items-center border-t border-gray-100 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-800/50 transition-colors">
                                    <div className="col-span-1 text-center">
                                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-400 text-xs font-black">{idx + 1}</span>
                                    </div>
                                    <div className="col-span-4">
                                        <span className="text-sm font-bold text-gray-900 dark:text-white">{rule.reportThreshold}</span>
                                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">unique reports</span>
                                    </div>
                                    <div className="col-span-4">
                                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-black bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-800">
                                            🚫 {rule.banDays} day{rule.banDays > 1 ? 's' : ''}
                                        </span>
                                    </div>
                                    <div className="col-span-3 flex justify-end">
                                        <button onClick={() => removeBanRule(idx)} className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors" title="Remove Rule">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    </div>
                                </div>
                            ))}

                            {/* Add New Rule */}
                            <div className="grid grid-cols-12 gap-2 px-4 sm:px-6 py-4 items-center border-t-2 border-dashed border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/30">
                                <div className="col-span-1 text-center">
                                    <span className="text-gray-300 dark:text-gray-600 text-lg">+</span>
                                </div>
                                <div className="col-span-4">
                                    <input
                                        type="number" min="1" max="999" placeholder="e.g. 100"
                                        value={newBanThreshold}
                                        onKeyDown={(e) => ['e', 'E', '+', '-', '.'].includes(e.key) && e.preventDefault()}
                                        onChange={e => setNewBanThreshold(e.target.value.replace(/\D/g, ''))}
                                        className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm font-bold text-gray-900 dark:text-white outline-none focus:border-indigo-500 transition-colors"
                                    />
                                </div>
                                <div className="col-span-4">
                                    <input
                                        type="number" min="1" max="365" placeholder="e.g. 120"
                                        value={newBanDays}
                                        onKeyDown={(e) => ['e', 'E', '+', '-', '.'].includes(e.key) && e.preventDefault()}
                                        onChange={e => setNewBanDays(e.target.value.replace(/\D/g, ''))}
                                        className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm font-bold text-gray-900 dark:text-white outline-none focus:border-indigo-500 transition-colors"
                                    />
                                </div>
                                <div className="col-span-3 flex justify-end">
                                    <button
                                        onClick={addBanRule}
                                        disabled={!newBanThreshold || !newBanDays}
                                        className="px-4 py-2 rounded-xl text-xs font-black uppercase bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95"
                                    >
                                        Add
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Auto-Remove System */}
                    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 sm:p-8">
                        <h2 className="text-xl font-black text-gray-900 dark:text-white">Content Moderation</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-8">Set the threshold for community-triggered listing removals.</p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 items-end">
                            <NumberField 
                                label="Listing Removal Threshold" 
                                value={settings.autoRemoveThreshold} 
                                onChange={v => update({ autoRemoveThreshold: v })} 
                                min={1} 
                                max={100} 
                            />
                            <div className="p-5 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-100 dark:border-amber-800/50">
                                <p className="text-xs font-bold text-amber-800 dark:text-amber-400 flex items-center gap-2">
                                    <span>⚠️</span> 
                                    <span>If a product/service hits <strong>{settings.autoRemoveThreshold}</strong> unique reports, it will be purged.</span>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════════════════════ CATEGORIES TAB ═══════════════════════ */}
            {activeTab === 'categories' && (
                <div className="space-y-8 animate-in fade-in duration-300">
                    {/* Product Categories */}
                    <CategorySection
                        title="Product Categories"
                        subtitle="Categories available when users list products for sale or rent."
                        icon="📦"
                        color="indigo"
                        items={settings.productCategories}
                        newValue={newProductCat}
                        onNewValueChange={setNewProductCat}
                        onAdd={() => addItem('productCategories', newProductCat, setNewProductCat)}
                        onRemove={(idx) => removeItem('productCategories', idx)}
                    />

                    {/* Service Categories */}
                    <CategorySection
                        title="Service Categories"
                        subtitle="Categories available when users offer services."
                        icon="🛠️"
                        color="emerald"
                        items={settings.serviceCategories}
                        newValue={newServiceCat}
                        onNewValueChange={setNewServiceCat}
                        onAdd={() => addItem('serviceCategories', newServiceCat, setNewServiceCat)}
                        onRemove={(idx) => removeItem('serviceCategories', idx)}
                    />

                    {/* Service Availability */}
                    <CategorySection
                        title="Service Availability"
                        subtitle="Availability options for service scheduling."
                        icon="🗓️"
                        color="indigo"
                        items={settings.serviceAvailability}
                        newValue={newServiceAvailability}
                        onNewValueChange={setNewServiceAvailability}
                        onAdd={() => addItem('serviceAvailability', newServiceAvailability, setNewServiceAvailability)}
                        onRemove={(idx) => removeItem('serviceAvailability', idx)}
                    />

                    {/* Product Conditions */}
                    <CategorySection
                        title="Product Conditions"
                        subtitle="Condition labels users can choose when listing products."
                        icon="✨"
                        color="amber"
                        items={settings.productConditions}
                        newValue={newCondition}
                        onNewValueChange={setNewCondition}
                        onAdd={() => addItem('productConditions', newCondition, setNewCondition)}
                        onRemove={(idx) => removeItem('productConditions', idx)}
                    />
                </div>
            )}

            {activeTab === 'visuals' && (
                <div className="space-y-8 animate-in fade-in duration-300">
                    <VisualGalleryManager
                        title="Default Avatars"
                        subtitle="Predefined avatar choices for new users. Best for circular mascots."
                        icon="🎭"
                        color="indigo"
                        items={settings.defaultAvatars}
                        onAdd={(url: string) => addItem('defaultAvatars', url, () => {})}
                        onRemove={(idx: number) => removeItem('defaultAvatars', idx)}
                        folder="recircle/defaults/avatars"
                    />

                    <VisualGalleryManager
                        title="Default Banners"
                        subtitle="Panoramic background options for user profile headers."
                        icon="🖼️"
                        color="emerald"
                        items={settings.defaultBanners}
                        onAdd={(url: string) => addItem('defaultBanners', url, () => {})}
                        onRemove={(idx: number) => removeItem('defaultBanners', idx)}
                        folder="recircle/defaults/banners"
                        aspect="banner"
                    />
                </div>
            )}

            {/* ═══════════════════════ LIMITS TAB ═══════════════════════ */}
            {activeTab === 'limits' && (
                <div className="space-y-8 animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 sm:p-8">
                        <h2 className="text-xl font-black text-gray-900 dark:text-white mb-1">Listing Limits</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">Control maximum images, prices, and other numeric constraints.</p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            <NumberField label="Max Product Images" value={settings.maxProductImages} onChange={v => update({ maxProductImages: v })} min={1} max={20} />
                            <NumberField label="Max Service Images" value={settings.maxServiceImages} onChange={v => update({ maxServiceImages: v })} min={1} max={20} />
                            <NumberField label="Min Price (₹)" value={settings.minPrice} onChange={v => update({ minPrice: v })} min={1} max={1000} />
                            <NumberField label="Max Product Price (₹)" value={settings.maxPriceProduct} onChange={v => update({ maxPriceProduct: v })} min={100} max={10000000} />
                            <NumberField label="Max Service Price (₹)" value={settings.maxPriceService} onChange={v => update({ maxPriceService: v })} min={100} max={10000000} />
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 sm:p-8">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h2 className="text-xl font-black text-gray-900 dark:text-white">API Rate Limits</h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Requests allowed per minute per IP address.</p>
                            </div>
                            <span className="text-xs font-black px-3 py-1 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-800 rounded-lg whitespace-nowrap">🔄 Synced via Middleware</span>
                        </div>

                        <div className="mb-8 p-5 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-800/50">
                            <h3 className="text-xs font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <span>ℹ️</span> Understanding Rate Limits
                            </h3>
                            <div className="space-y-3 text-xs leading-relaxed text-indigo-900/70 dark:text-indigo-300/70 font-medium">
                                <p>• <strong className="text-indigo-900 dark:text-indigo-200">General API:</strong> Counts every <code>/api</code> request (e.g., listings, search, cities) and session checks like <code>/api/auth/me</code>. A single refresh sends ~5 requests. Setting this to 100 allows ~20 refreshes/min.</p>
                                <p>• <strong className="text-indigo-900 dark:text-indigo-200">Auth API:</strong> Stricter limit for sensitive write operations like <strong className="text-indigo-900 dark:text-indigo-200">Login, Register, OTP, and Reset Password</strong>. This prevents automated brute-force attacks.</p>
                                <p>• <strong className="text-indigo-900 dark:text-indigo-200">The "Refresh" Factor:</strong> Every time a user refreshes their browser, the app re-fetches their profile, site config, and listings. If they spam refresh, they will hit these limits quickly.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <NumberField label="General API (req/min)" value={settings.apiRateLimitGeneral} onChange={v => update({ apiRateLimitGeneral: v })} min={10} max={1000} />
                            <NumberField label="Auth API (req/min)" value={settings.apiRateLimitAuth} onChange={v => update({ apiRateLimitAuth: v })} min={5} max={100} />
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 sm:p-8">
                        <h2 className="text-xl font-black text-gray-900 dark:text-white mb-1">Character Limits</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">Constraints for user-facing text fields and textareas.</p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            <NumberField label="Report Details (Chars)" value={settings.maxReportOtherChars} onChange={v => update({ maxReportOtherChars: v })} min={100} max={5000} />
                            <NumberField label="Review Comment (Chars)" value={settings.maxReviewChars} onChange={v => update({ maxReviewChars: v })} min={100} max={5000} />
                            <NumberField label="Offer Message (Chars)" value={settings.maxOfferMessageChars} onChange={v => update({ maxOfferMessageChars: v })} min={50} max={2000} />
                            <NumberField label="Board Post (Chars)" value={settings.maxBoardPostChars} onChange={v => update({ maxBoardPostChars: v })} min={100} max={2000} />
                            <NumberField label="Board Reply (Chars)" value={settings.maxBoardReplyChars} onChange={v => update({ maxBoardReplyChars: v })} min={50} max={1000} />
                            <NumberField label="Search Box (Chars)" value={settings.maxSearchChars} onChange={v => update({ maxSearchChars: v })} min={10} max={500} />
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════════════════════ PLATFORM TAB ═══════════════════════ */}
            {activeTab === 'platform' && (
                <div className="space-y-8 animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 sm:p-8">
                        <h2 className="text-xl font-black text-gray-900 dark:text-white mb-1">Platform Controls</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">Emergency toggles and platform-wide switches.</p>

                        <div className="space-y-4">
                            <ToggleRow
                                label="Maintenance Mode"
                                description="When enabled, the platform shows a maintenance page to all users except admins."
                                checked={settings.maintenanceMode}
                                onChange={v => update({ maintenanceMode: v })}
                                color="red"
                            />
                            <ToggleRow
                                label="New Registrations"
                                description="Allow new users to create accounts on the platform."
                                checked={settings.newRegistrationsEnabled}
                                onChange={v => update({ newRegistrationsEnabled: v })}
                                color="emerald"
                            />
                            <ToggleRow
                                label="New Listings"
                                description="Allow users to create new product or service listings."
                                checked={settings.newListingsEnabled}
                                onChange={v => update({ newListingsEnabled: v })}
                                color="indigo"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════════════════════ EMAIL TAB ═══════════════════════ */}
            {activeTab === 'email' && (
                <div className="space-y-8 animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 sm:p-8">
                        <h2 className="text-xl font-black text-gray-900 dark:text-white mb-1">Email Notifications</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">Control which automated emails the platform sends.</p>

                        <div className="space-y-4">
                            <ToggleRow
                                label="Ban Notification Email"
                                description="Send email to users when their account is suspended (auto-ban or manual)."
                                checked={settings.banEmailEnabled}
                                onChange={v => update({ banEmailEnabled: v })}
                                color="red"
                            />
                            <ToggleRow
                                label="OTP Verification Email"
                                description="Send OTP codes via email for account verification and password resets."
                                checked={settings.otpEmailEnabled}
                                onChange={v => update({ otpEmailEnabled: v })}
                                color="indigo"
                            />
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 sm:p-8">
                        <h2 className="text-xl font-black text-gray-900 dark:text-white mb-1">SMTP Configuration</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Email sending is configured via server environment variables.</p>

                        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-2xl p-6 border border-gray-100 dark:border-gray-700">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">Active SMTP Profile</h3>
                                    <p className="text-xs text-gray-500 mt-1">Select the active mailer. Make sure the credentials exist in .env.</p>
                                </div>
                                <select
                                    value={settings.activeSmtpIndex}
                                    onChange={e => update({ activeSmtpIndex: parseInt(e.target.value) })}
                                    className="bg-white dark:bg-gray-800 border-2 border-indigo-100 dark:border-gray-700 text-sm font-bold rounded-xl px-4 py-2 cursor-pointer outline-none focus:border-indigo-500"
                                >
                                    <option value={1}>Primary (Gmail)</option>
                                    <option value={2}>Secondary (Brevo)</option>
                                    <option value={3}>Tertiary (Resend)</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                {/* SMTP 1 Stats — Gmail */}
                                <div className={`p-4 rounded-xl border-2 transition-all ${settings.activeSmtpIndex === 1 ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/20 shadow-md' : 'border-transparent bg-white dark:bg-gray-800'}`}>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">Gmail</span>
                                        {settings.activeSmtpIndex === 1 && <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>}
                                    </div>
                                    <div className="flex items-end gap-2">
                                        <span className="text-2xl font-black text-blue-600 dark:text-blue-400">{usage?.smtp1Sent || 0}</span>
                                        <span className="text-xs font-bold text-gray-400 mb-1">sent today</span>
                                    </div>
                                </div>

                                {/* SMTP 2 Stats — Brevo */}
                                <div className={`p-4 rounded-xl border-2 transition-all ${settings.activeSmtpIndex === 2 ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/20 shadow-md' : 'border-transparent bg-white dark:bg-gray-800'}`}>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">Brevo</span>
                                        {settings.activeSmtpIndex === 2 && <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>}
                                    </div>
                                    <div className="flex items-end gap-2">
                                        <span className="text-2xl font-black text-purple-600 dark:text-purple-400">{usage?.smtp2Sent || 0}</span>
                                        <span className="text-xs font-bold text-gray-400 mb-1">sent today</span>
                                    </div>
                                </div>

                                {/* SMTP 3 Stats — Resend */}
                                <div className={`p-4 rounded-xl border-2 transition-all ${settings.activeSmtpIndex === 3 ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/20 shadow-md' : 'border-transparent bg-white dark:bg-gray-800'}`}>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">Resend</span>
                                        {settings.activeSmtpIndex === 3 && <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>}
                                    </div>
                                    <div className="flex items-end gap-2">
                                        <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{usage?.smtp3Sent || 0}</span>
                                        <span className="text-xs font-bold text-gray-400 mb-1">sent today</span>
                                    </div>
                                </div>
                            </div>
                            <p className="mt-6 text-xs text-center text-gray-400 dark:text-gray-500 border-t border-gray-200 dark:border-gray-700 pt-4">To update credentials, modify <code className="font-mono bg-gray-200 dark:bg-gray-800 px-1.5 py-0.5 rounded">SMTP_EMAIL_X</code> in your .env file.</p>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════════════════════ SECURITY TAB ═══════════════════════ */}
            {activeTab === 'security' && (
                <div className="space-y-8 animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 sm:p-8">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center text-xl shadow-inner">👤</div>
                            <div>
                                <h2 className="text-xl font-black text-gray-900 dark:text-white leading-tight">Account Security</h2>
                                <p className="text-[10px] uppercase font-black tracking-widest text-gray-400 dark:text-gray-500 mt-1">Brute-force protection for individual user accounts</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            <NumberField label="Login Max Failures" value={settings.loginMaxAttempts} onChange={v => update({ loginMaxAttempts: v })} min={3} max={20} />
                            <NumberField label="Login Lockout (Mins)" value={settings.loginLockoutMins} onChange={v => update({ loginLockoutMins: v })} min={5} max={1440} />
                            <NumberField label="OTP Cooldown (Secs)" value={settings.otpSendCooldownSecs} onChange={v => update({ otpSendCooldownSecs: v })} min={30} max={300} />
                            <NumberField label="OTP Max Failures" value={settings.otpVerifyMaxAttempts} onChange={v => update({ otpVerifyMaxAttempts: v })} min={2} max={10} />
                            <NumberField label="OTP Lockout (Mins)" value={settings.otpVerifyLockoutMins} onChange={v => update({ otpVerifyLockoutMins: v })} min={1} max={60} />
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 sm:p-8">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-xl shadow-inner">🌐</div>
                            <div>
                                <h2 className="text-xl font-black text-gray-900 dark:text-white leading-tight">IP-Based Rate Limits</h2>
                                <p className="text-[10px] uppercase font-black tracking-widest text-gray-400 dark:text-gray-500 mt-1">Maximum allowed attempts per hour per individual IP address</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            <NumberField label="Login Limit (/hr)" value={settings.ipLimitLoginPerHour} onChange={v => update({ ipLimitLoginPerHour: v })} min={5} max={500} />
                            <NumberField label="Register Limit (/hr)" value={settings.ipLimitRegisterPerHour} onChange={v => update({ ipLimitRegisterPerHour: v })} min={1} max={50} />
                            <NumberField label="OTP Send Limit (/hr)" value={settings.ipLimitOtpSendPerHour} onChange={v => update({ ipLimitOtpSendPerHour: v })} min={1} max={100} />
                            <NumberField label="OTP Verify Limit (/hr)" value={settings.ipLimitOtpVerifyPerHour} onChange={v => update({ ipLimitOtpVerifyPerHour: v })} min={1} max={200} />
                            <NumberField label="Check Email Limit (/hr)" value={settings.ipLimitCheckEmailPerHour} onChange={v => update({ ipLimitCheckEmailPerHour: v })} min={1} max={500} />
                            <NumberField label="Reset Password (/hr)" value={settings.ipLimitResetPasswordPerHour} onChange={v => update({ ipLimitResetPasswordPerHour: v })} min={1} max={50} />
                        </div>

                        <div className="mt-8 p-5 bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900/30">
                            <p className="text-xs font-bold text-blue-800 dark:text-blue-400 flex items-center gap-3">
                                <span className="text-base text-blue-500">🛡️</span>
                                <span>These limits protect your server resources and prevent bulk automated testing across multiple accounts. Lower these values if you suspect a bot attack.</span>
                            </p>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 sm:p-8">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center text-xl shadow-inner">🚨</div>
                            <div>
                                <h2 className="text-xl font-black text-gray-900 dark:text-white leading-tight">Advanced OTP Protection</h2>
                                <p className="text-[10px] uppercase font-black tracking-widest text-gray-400 dark:text-gray-500 mt-1">Prevent SMTP abuse and unexpected email costs</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <NumberField label="Max OTP Per Email (/hr)" value={settings.maxOtpPerEmailPerHour} onChange={v => update({ maxOtpPerEmailPerHour: v })} min={1} max={20} />
                                    <NumberField label="Global Daily Send Cap" value={settings.globalDailyOtpLimit} onChange={v => update({ globalDailyOtpLimit: v })} min={10} max={10000} />
                                </div>
                            </div>

                            {/* Live Usage Tracker */}
                            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-5 border border-slate-100 dark:border-slate-800">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Today's Usage</p>
                                <div className="flex items-end justify-between mb-2">
                                    <span className="text-2xl font-black text-slate-900 dark:text-white">{usage?.sentInLast24h || 0}</span>
                                    <span className="text-xs font-bold text-slate-400">/ {settings.globalDailyOtpLimit} sent</span>
                                </div>
                                <div className="h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full transition-all duration-1000 ${
                                            (usage?.sentInLast24h || 0) / settings.globalDailyOtpLimit > 0.8 ? 'bg-rose-500' : 'bg-indigo-600'
                                        }`}
                                        style={{ width: `${Math.min(100, ((usage?.sentInLast24h || 0) / settings.globalDailyOtpLimit) * 100)}%` }}
                                    />
                                </div>
                                <p className="text-[9px] font-bold text-slate-400 mt-3 flex items-center gap-1.5 uppercase">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                    Real-time usage tracking active
                                </p>
                            </div>
                        </div>
                        
                        <div className="mt-8 p-5 bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-100 dark:border-amber-900/30">
                            <p className="text-xs font-bold text-amber-800 dark:text-amber-400 flex items-center gap-3">
                                <span className="text-base text-amber-500">⚠️</span>
                                <span>The <b>Daily Sending Cap</b> is a hard limit for the entire platform. If reached, NO more OTPs will be sent today. Use this to prevent massive bills if your site is attacked.</span>
                            </p>
                        </div>
                    </div>
                </div>
            )}
            
                                {/* Mobile Sticky Save Button */}
                                <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 animate-in slide-in-from-bottom-8 duration-500 pb-safe">
                                    <button
                                        onClick={saveSettings}
                                        disabled={saving || !dirty}
                                        className={`w-full py-6 rounded-t-[1.5rem] text-[10px] uppercase tracking-widest font-black transition-all shadow-[0_-10px_40px_rgba(79,70,229,0.3)] disabled:opacity-40 disabled:cursor-not-allowed ${
                                            dirty ? 'bg-indigo-600 outline outline-4 outline-white/10 dark:outline-black/50 text-white animate-pulse' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                                        }`}
                                    >
                                        {saving ? 'Saving...' : dirty ? '● Save Changes' : 'Saved ✓'}
                                    </button>
                                </div>

                            </div>
                        )}
                        {!activeTab && (
                            <div className="hidden md:flex h-full items-center justify-center text-slate-300 dark:text-slate-700 mt-20">
                                <p className="text-xs font-black uppercase tracking-[0.3em] italic">Select a category to manage</p>
                            </div>
                        )}
                    </main>
                </div>
            </div>
        </div>
    );
}

function VisualGalleryManager({ title, subtitle, icon, color, items, onAdd, onRemove, folder, aspect = 'square' }: any) {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl bg-${color}-50 dark:bg-${color}-900/20 flex items-center justify-center text-xl shadow-inner`}>
                        {icon}
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-gray-900 dark:text-white leading-tight">{title}</h2>
                        <p className="text-xs font-bold text-gray-400 dark:text-gray-500 mt-1 uppercase tracking-tight">{subtitle}</p>
                    </div>
                </div>
                <div className="shrink-0 flex items-center gap-3">
                    <ImageUpload
                        label="Upload Image"
                        folder={folder}
                        onUpload={onAdd}
                        className="w-full sm:w-auto"
                        imageClassName="hidden"
                        buttonClassName="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100 dark:shadow-none transition-all active:scale-95"
                    />
                    <div className="h-6 w-px bg-gray-100 dark:bg-gray-700 hidden sm:block" />
                    <button 
                        type="button"
                        onClick={() => {
                            const url = prompt('Enter Direct Image URL (or DiceBear link):');
                            if (url) onAdd(url);
                        }}
                        className="p-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-400 dark:text-gray-500 rounded-xl transition-colors"
                        title="Add via URL"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.827a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                    </button>
                </div>
            </div>

            <div className={`grid ${aspect === 'banner' ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-3 sm:grid-cols-5 md:grid-cols-6'} gap-4`}>
                {items?.map((url: string, idx: number) => (
                    <div key={idx} className="group relative animate-in zoom-in-95 duration-300">
                        <div className={`relative ${aspect === 'banner' ? 'aspect-[5/2]' : 'aspect-square'} rounded-2xl overflow-hidden bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 shadow-sm`}>
                            <NextImage 
                                src={url} 
                                alt={`Asset ${idx}`} 
                                fill 
                                className="object-cover transition-transform duration-500 group-hover:scale-110" 
                                unoptimized={url.includes('dicebear')}
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <button
                                    type="button"
                                    onClick={() => onRemove(idx)}
                                    className="p-2 bg-rose-600 text-white rounded-lg transform scale-0 group-hover:scale-100 transition-transform hover:bg-rose-700"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
                
                {(!items || items.length === 0) && (
                    <div className="col-span-full py-12 flex flex-col items-center justify-center border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-3xl">
                        <span className="text-3xl mb-2 opacity-20">🏜️</span>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">No assets added yet</p>
                    </div>
                )}
            </div>
        </div>
    );
}

/* ─── Reusable Components ─── */

function CategorySection({ title, subtitle, icon, color, items, newValue, onNewValueChange, onAdd, onRemove }: {
    title: string; subtitle: string; icon: string; color: string;
    items: string[]; newValue: string; onNewValueChange: (v: string) => void;
    onAdd: () => void; onRemove: (idx: number) => void;
}) {
    const colorMap: Record<string, string> = {
        indigo: 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 border-indigo-100 dark:border-indigo-800',
        emerald: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800',
        amber: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-800',
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-1">
                <span className="text-2xl">{icon}</span>
                <h2 className="text-xl font-black text-gray-900 dark:text-white">{title}</h2>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 ml-10">{subtitle}</p>

            <div className="flex flex-wrap gap-2 mb-6">
                {items.map((item, idx) => (
                    <span key={idx} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold border ${colorMap[color] || colorMap.indigo}`}>
                        {item}
                        <button onClick={() => onRemove(idx)} className="ml-1 opacity-50 hover:opacity-100 transition-opacity" title="Remove">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </span>
                ))}
            </div>

            <div className="flex gap-2">
                <input
                    type="text" placeholder={`Add new ${title.toLowerCase().replace(/s$/, '')}...`}
                    value={newValue}
                    onChange={e => onNewValueChange(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), onAdd())}
                    className="flex-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm font-bold text-gray-900 dark:text-white outline-none focus:border-indigo-500 transition-colors"
                />
                <button onClick={onAdd} disabled={!newValue.trim()} className="px-5 py-2.5 rounded-xl text-xs font-black uppercase bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95">
                    Add
                </button>
            </div>
        </div>
    );
}

function ToggleRow({ label, description, checked, onChange, color }: { label: string; description: string; checked: boolean; onChange: (v: boolean) => void; color: string }) {
    const ringColor = color === 'red' ? 'peer-focus:ring-red-300 dark:peer-focus:ring-red-800' : color === 'emerald' ? 'peer-focus:ring-emerald-300 dark:peer-focus:ring-emerald-800' : 'peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800';
    const bgColor = color === 'red' ? 'peer-checked:bg-red-600 dark:peer-checked:bg-red-500' : color === 'emerald' ? 'peer-checked:bg-emerald-600 dark:peer-checked:bg-emerald-500' : 'peer-checked:bg-indigo-600 dark:peer-checked:bg-indigo-500';

    return (
        <div className="flex items-center justify-between p-5 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-700 hover:bg-gray-100/50 dark:hover:bg-gray-800/50 transition-colors">
            <div>
                <p className="text-sm font-bold text-gray-900 dark:text-white">{label}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 max-w-md">{description}</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 ml-4">
                <input type="checkbox" className="sr-only peer" checked={checked} onChange={e => onChange(e.target.checked)} />
                <div className={`w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-4 ${ringColor} rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${bgColor}`}></div>
            </label>
        </div>
    );
}

function NumberField({ label, value, onChange, min, max }: { label: string; value: number; onChange: (v: number) => void; min: number; max: number }) {
    const [localValue, setLocalValue] = useState(value.toString());

    useEffect(() => {
        setLocalValue(value.toString());
    }, [value]);

    const handleBlur = () => {
        const parsed = parseInt(localValue);
        if (isNaN(parsed)) {
            setLocalValue(value.toString());
        } else {
            const clamped = Math.max(min, Math.min(max, parsed));
            setLocalValue(clamped.toString());
            onChange(clamped);
        }
    };

    return (
        <div>
            <label className="block text-[11px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">{label}</label>
            <input
                type="number" 
                value={localValue}
                onKeyDown={(e) => ['e', 'E', '+', '-'].includes(e.key) && e.preventDefault()}
                onChange={e => setLocalValue(e.target.value)}
                onBlur={handleBlur}
                className="w-full bg-gray-50 dark:bg-gray-900 border-2 border-gray-100 dark:border-gray-700 rounded-2xl px-4 py-3.5 text-sm font-black text-gray-900 dark:text-white outline-none focus:border-indigo-500 transition-colors"
                placeholder={`${min} - ${max}`}
            />
        </div>
    );
}
