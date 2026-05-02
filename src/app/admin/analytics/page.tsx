'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface AnalyticsData {
    users: { total: number; verified: number; recentSignups: number };
    inventory: { 
        products: { total: number; active: number; sold: number; reserved: number };
        services: { total: number; active: number; inactive: number };
    };
    transactions: { 
        totalOrders: number; productOrders: number; serviceOrders: number; 
        completedOrders: number; completedProductOrders: number; completedServiceOrders: number;
        cancelledOrders: number; cancelledProductOrders: number; cancelledServiceOrders: number;
        pendingOrders: number; pendingProductOrders: number; pendingServiceOrders: number; 
        grossVolume: number;
    };
    moderation: { openDisputes: number; pendingReports: number };
    activityStream: { latestUsers: any[]; latestOrders: any[] };
    graphs: {
        dailySignups: { _id: string, count: number, emailCount?: number, googleCount?: number }[];
        monthlySignups: { _id: string, count: number, emailCount?: number, googleCount?: number }[];
        dailySmtp: { dateId: string, smtp1: number, smtp2: number, smtp3: number }[];
        monthlySmtp: { _id: string, smtp1: number, smtp2: number, smtp3: number }[];
    };
}

interface SettingsData {
    activeSmtpIndex: number;
    globalDailyOtpLimit: number;
}
interface UsageData {
    sentInLast24h: number;
    smtp1Sent: number;
    smtp2Sent: number;
    smtp3Sent: number;
}

export default function AdminAnalyticsPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();

    const [data, setData] = useState<AnalyticsData | null>(null);
    const [settings, setSettings] = useState<SettingsData | null>(null);
    const [usage, setUsage] = useState<UsageData | null>(null);
    const [usersGraphView, setUsersGraphView] = useState<'days' | 'months'>('days');
    const [smtpGraphView, setSmtpGraphView] = useState<'days' | 'months'>('days');
    
    const [loading, setLoading] = useState(true);
    const [updatingSmtp, setUpdatingSmtp] = useState(false);

    useEffect(() => {
        if (!authLoading && (!user || user.role !== 'admin')) {
            router.replace('/');
            return;
        }

        if (user && user.role === 'admin') {
            fetchData();
        }
    }, [user, authLoading, router]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [analyticsRes, settingsRes] = await Promise.all([
                fetch('/api/admin/analytics'),
                fetch('/api/admin/settings')
            ]);

            if (analyticsRes.ok) {
                const json = await analyticsRes.json();
                setData(json);
            }
            if (settingsRes.ok) {
                const json = await settingsRes.json();
                setSettings(json.settings);
                setUsage({
                    sentInLast24h: json.usage.sentInLast24h || 0,
                    smtp1Sent: json.usage.smtp1Sent || 0,
                    smtp2Sent: json.usage.smtp2Sent || 0,
                    smtp3Sent: json.usage.smtp3Sent || 0
                });
            }
        } catch (error) {
            console.error("Failed to fetch dashboard data", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSmtpChange = async (index: number) => {
        if (!settings) return;
        setUpdatingSmtp(true);
        try {
            const res = await fetch('/api/admin/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ activeSmtpIndex: index })
            });
            if (res.ok) {
                setSettings({ ...settings, activeSmtpIndex: index });
            }
        } catch (error) {
            console.error("Failed to update SMTP", error);
        } finally {
            setUpdatingSmtp(false);
        }
    };

    if (authLoading || loading) {
        return (
            <div className="min-h-screen pt-24 pb-12 flex items-center justify-center bg-[#f8fafc] dark:bg-gray-950">
                <div className="w-12 h-12 rounded-full border-4 border-indigo-200 dark:border-indigo-900 border-t-indigo-600 dark:border-t-indigo-500 animate-spin"></div>
            </div>
        );
    }

    if (!data) return null;

    return (
        <div className="min-h-screen pt-20 pb-12 bg-[#f8fafc] dark:bg-gray-950 selection:bg-indigo-500/30">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                
                {/* Header */}
                <div className="mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <h1 className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white tracking-tight">System Analytics 📈</h1>
                    <p className="mt-2 text-sm sm:text-base text-gray-500 dark:text-gray-400 font-medium">Real-time overview of marketplace performance, user metrics, and security limits.</p>
                </div>

                {/* ─── SMTP Live Performance Widget ─── */}
                <div className="mb-8 grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in zoom-in-95 duration-500">
                    <div className="lg:col-span-1 bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 sm:p-8 flex flex-col justify-between">
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-black text-gray-900 dark:text-white">Active Mailer</h2>
                                <span className="flex h-3 w-3 relative">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                                </span>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
                                Select the active transport to send OTPs and notifications. Ensure your environment variables are configured correctly for both profiles.
                            </p>
                            
                            <div className="space-y-3">
                                <button 
                                    onClick={() => handleSmtpChange(1)}
                                    disabled={updatingSmtp}
                                    className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all text-left ${settings?.activeSmtpIndex === 1 ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30' : 'border-gray-100 dark:border-gray-800 hover:border-indigo-300 dark:hover:border-indigo-700 bg-transparent'}`}
                                >
                                    <div>
                                        <p className={`font-bold ${settings?.activeSmtpIndex === 1 ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-700 dark:text-gray-300'}`}>Primary SMTP</p>
                                        <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-0.5">SMTP_EMAIL</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-lg font-black text-gray-900 dark:text-white">{usage?.smtp1Sent}</p>
                                        <p className="text-[10px] text-gray-500">Sent Today</p>
                                    </div>
                                </button>
                                
                                <button 
                                    onClick={() => handleSmtpChange(2)}
                                    disabled={updatingSmtp}
                                    className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all text-left ${settings?.activeSmtpIndex === 2 ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30' : 'border-gray-100 dark:border-gray-800 hover:border-indigo-300 dark:hover:border-indigo-700 bg-transparent'}`}
                                >
                                    <div>
                                        <p className={`font-bold ${settings?.activeSmtpIndex === 2 ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-700 dark:text-gray-300'}`}>Secondary SMTP</p>
                                        <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-0.5">SMTP_EMAIL_2</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-lg font-black text-gray-900 dark:text-white">{usage?.smtp2Sent}</p>
                                        <p className="text-[10px] text-gray-500">Sent Today</p>
                                    </div>
                                </button>

                                <button 
                                    onClick={() => handleSmtpChange(3)}
                                    disabled={updatingSmtp}
                                    className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all text-left ${settings?.activeSmtpIndex === 3 ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30' : 'border-gray-100 dark:border-gray-800 hover:border-indigo-300 dark:hover:border-indigo-700 bg-transparent'}`}
                                >
                                    <div>
                                        <p className={`font-bold ${settings?.activeSmtpIndex === 3 ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-700 dark:text-gray-300'}`}>Tertiary Mailer</p>
                                        <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-0.5">RESEND_API_KEY</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-lg font-black text-gray-900 dark:text-white">{usage?.smtp3Sent}</p>
                                        <p className="text-[10px] text-gray-500">Sent Today</p>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 sm:p-8 flex flex-col justify-center">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h2 className="text-lg font-black text-gray-900 dark:text-white">Global Daily Reach</h2>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 uppercase tracking-widest font-bold">Total Platform Emails</p>
                            </div>
                            <div className="text-right">
                                <span className="text-4xl font-black text-indigo-600 dark:text-indigo-400">{usage?.sentInLast24h}</span>
                                <span className="text-sm font-bold text-gray-500 ml-2">/ {settings?.globalDailyOtpLimit} max</span>
                            </div>
                        </div>

                        {settings && usage && (
                            <div className="relative pt-6">
                                <div className="absolute top-0 text-[10px] font-black uppercase tracking-widest text-gray-400 left-[0%] transform -translate-x-1/2">0</div>
                                <div className="absolute top-0 text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 left-[50%] transform -translate-x-1/2 opacity-50">50%</div>
                                <div className="absolute top-0 text-[10px] font-black uppercase tracking-widest text-rose-500 left-[100%] transform -translate-x-1/2">Limit</div>
                                
                                <div className="h-6 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden flex relative z-10 shadow-inner">
                                    <div 
                                        className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 transition-all duration-1000 ease-in-out relative group"
                                        style={{ width: `${Math.min(100, (usage.sentInLast24h / settings.globalDailyOtpLimit) * 100)}%` }}
                                    >
                                        <div className="absolute inset-0 bg-white/20 overflow-hidden">
                                            <div className="h-full w-full animate-pulse blur-md bg-white"></div>
                                        </div>
                                    </div>
                                </div>
                                <p className="text-center text-xs font-bold text-gray-500 mt-4">
                                    {((usage.sentInLast24h / settings.globalDailyOtpLimit) * 100).toFixed(1)}% of daily allowance consumed.
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* ─── Premium Twin Analytics Dashboards ─── */}
                <div className="mb-12 grid grid-cols-1 xl:grid-cols-2 gap-8 animate-in slide-in-from-bottom-8 duration-700 delay-150">
                    
                    {/* 1. Registration Velocity (Gradient Line/Bar Hybrid) */}
                    <div className="bg-white dark:bg-gray-900 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-800 p-8 relative group">
                        {/* Decorative background wrapper */}
                        <div className="absolute inset-0 overflow-hidden rounded-[2rem] pointer-events-none">
                            <div className="absolute top-0 right-0 p-32 bg-indigo-50 dark:bg-indigo-900/10 rounded-full blur-[100px] -mr-16 -mt-16 transition-opacity opacity-50 group-hover:opacity-100"></div>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-10 relative z-10">
                            <div>
                                <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Platform Growth</h2>
                                <p className="text-sm font-medium text-gray-500 mt-1">New user adoption velocity</p>
                            </div>
                            <div className="flex flex-col items-end gap-3">
                                <div className="flex bg-gray-50 dark:bg-gray-800/80 p-1 rounded-xl shadow-inner border border-gray-100 dark:border-gray-700/50">
                                    <button 
                                        onClick={() => setUsersGraphView('days')} 
                                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${usersGraphView === 'days' ? 'bg-white dark:bg-gray-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
                                    >
                                        30D
                                    </button>
                                    <button 
                                        onClick={() => setUsersGraphView('months')}
                                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${usersGraphView === 'months' ? 'bg-white dark:bg-gray-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
                                    >
                                        12M
                                    </button>
                                </div>
                                <div className="flex items-center gap-4 bg-white dark:bg-gray-800/50 py-1.5 px-3 rounded-xl border border-gray-100 dark:border-gray-700/50 shadow-sm">
                                    <div className="flex items-center gap-2 text-[11px] font-bold text-gray-600 dark:text-gray-300 uppercase tracking-widest">
                                        <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]"></span> Email
                                    </div>
                                    <div className="w-px h-3 bg-gray-300 dark:bg-gray-600"></div>
                                    <div className="flex items-center gap-2 text-[11px] font-bold text-gray-600 dark:text-gray-300 uppercase tracking-widest">
                                        <span className="w-2.5 h-2.5 rounded-sm bg-teal-400 shadow-[0_0_8px_rgba(45,212,191,0.6)]"></span> Google
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="relative h-64 w-full mt-4">
                            {/* Y-Axis Grid Lines */}
                            <div className="absolute inset-0 flex flex-col justify-between pt-2 pb-6 pointer-events-none z-0">
                                {[0, 1, 2, 3].map((_, i) => (
                                    <div key={i} className="w-full border-t border-dashed border-gray-200 dark:border-gray-800 flex-1 relative">
                                        {i === 0 && (() => {
                                            const activeData = usersGraphView === 'days' ? data.graphs?.dailySignups : data.graphs?.monthlySignups;
                                            const max = Math.max(...(activeData?.map((d: any) => d.count) || []), 1);
                                            return <span className="absolute -top-3 -left-2 bg-white dark:bg-gray-900 text-[10px] font-bold text-gray-400 px-1">{max}</span>;
                                        })()}
                                    </div>
                                ))}
                                <div className="w-full border-t border-solid border-gray-300 dark:border-gray-700 relative">
                                    <span className="absolute -top-3 -left-2 bg-white dark:bg-gray-900 text-[10px] font-bold text-gray-400 px-1">0</span>
                                </div>
                            </div>

                            {/* Chart Data Render */}
                            <div className="absolute inset-0 pt-2 pb-6 flex items-end gap-[2px] sm:gap-1 z-10 px-4">
                                {(() => {
                                    const activeData = usersGraphView === 'days' ? data.graphs?.dailySignups : data.graphs?.monthlySignups;
                                    if (!activeData || activeData.length === 0) return null;
                                    
                                    const maxCount = Math.max(...activeData.map((d: any) => d.count), 1);
                                    
                                    return activeData.map((d: any, i: number) => {
                                        const emailCount = d.emailCount || 0;
                                        const googleCount = d.googleCount || 0;
                                        // Handle legacy accounts that don't have accurate sub-counts but do have 'count'
                                        const displayedGoogle = (emailCount + googleCount === 0) ? 0 : googleCount;
                                        const displayedEmail = (emailCount + googleCount === 0) ? d.count : emailCount;

                                        const e1h = (displayedEmail / maxCount) * 100;
                                        const e2h = (displayedGoogle / maxCount) * 100;

                                        return (
                                        <div key={i} className="flex-1 flex flex-col justify-end group/bar h-full relative cursor-pointer">
                                            {/* Hover highlight pillar behind the bar */}
                                            <div className="absolute inset-0 bg-gray-50/50 dark:bg-gray-800/30 opacity-0 group-hover/bar:opacity-100 rounded-t-lg transition-opacity -mx-0.5"></div>

                                            {/* Beautiful Tooltip */}
                                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 pointer-events-none opacity-0 group-hover/bar:opacity-100 transition-all duration-200 z-50">
                                                <div className="bg-gray-900 dark:bg-black backdrop-blur-md text-white text-[11px] font-bold p-3 rounded-xl shadow-2xl border border-gray-700 whitespace-nowrap min-w-[120px]">
                                                    <div className="text-gray-400 text-center text-[9px] uppercase tracking-widest mb-2 border-b border-gray-800 pb-1">{d._id}</div>
                                                    <div className="flex items-center justify-between gap-4 mb-1"><span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-indigo-500"></span> Email Auth</span> <span>{displayedEmail}</span></div>
                                                    <div className="flex items-center justify-between gap-4 mb-2"><span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-teal-400"></span> Google Auth</span> <span>{displayedGoogle}</span></div>
                                                    <div className="pt-1.5 border-t border-gray-700 flex justify-between text-indigo-300"><span>Total</span> <span>{d.count}</span></div>
                                                    {/* Little downward arrow */}
                                                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-black"></div>
                                                </div>
                                            </div>

                                            {/* Stacked bars */}
                                            <div className="w-full relative z-10 flex flex-col justify-end gap-[1px]" style={{ height: `${e1h + e2h}%`, minHeight: '4px' }}>
                                                {e2h > 0 && <div className="w-full bg-teal-400 hover:bg-teal-300 transition-colors rounded-t-[3px] shadow-[0_0_10px_rgba(45,212,191,0.3)]" style={{ height: `${(e2h / (e1h + e2h)) * 100}%` }}></div>}
                                                {e1h > 0 && <div className="w-full bg-indigo-500 hover:bg-indigo-400 transition-colors shadow-[0_0_10px_rgba(99,102,241,0.3)] rounded-[2px]" style={{ height: `${(e1h / (e1h + e2h)) * 100}%` }}></div>}
                                            </div>
                                        </div>
                                    )});
                                })()}
                            </div>
                        </div>

                        {/* X-Axis labels */}
                        {data.graphs && (data.graphs.dailySignups?.length > 0 || data.graphs.monthlySignups?.length > 0) && (
                            <div className="flex justify-between mt-2 text-[10px] font-black text-gray-400 uppercase tracking-widest px-4 border-t border-transparent pt-3">
                                <span>{usersGraphView === 'days' ? data.graphs.dailySignups[0]?._id : data.graphs.monthlySignups[0]?._id}</span>
                                <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span> TODAY</span>
                            </div>
                        )}
                    </div>

                    {/* 2. Email Delivery Matrix (Stacked Glassmorphism) */}
                    <div className="bg-white dark:bg-gray-900 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-800 p-8 relative group">
                        {/* Decorative background wrapper */}
                        <div className="absolute inset-0 overflow-hidden rounded-[2rem] pointer-events-none">
                            <div className="absolute bottom-0 left-0 p-32 bg-purple-50 dark:bg-purple-900/10 rounded-full blur-[100px] -ml-16 -mb-16 transition-opacity opacity-50 group-hover:opacity-100"></div>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4 relative z-10">
                            <div>
                                <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Delivery Matrix</h2>
                                <p className="text-sm font-medium text-gray-500 mt-1">Infrastructure distribution payload</p>
                            </div>
                            
                            <div className="flex flex-col items-end gap-3">
                                <div className="flex bg-gray-50 dark:bg-gray-800/80 p-1 rounded-xl shadow-inner border border-gray-100 dark:border-gray-700/50">
                                    <button 
                                        onClick={() => setSmtpGraphView('days')} 
                                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${smtpGraphView === 'days' ? 'bg-white dark:bg-gray-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
                                    >
                                        30D
                                    </button>
                                    <button 
                                        onClick={() => setSmtpGraphView('months')}
                                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${smtpGraphView === 'months' ? 'bg-white dark:bg-gray-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
                                    >
                                        12M
                                    </button>
                                </div>
                                <div className="flex items-center gap-4 bg-white dark:bg-gray-800/50 py-1.5 px-3 rounded-xl border border-gray-100 dark:border-gray-700/50 shadow-sm">
                                    <div className="flex items-center gap-2 text-[11px] font-bold text-gray-600 dark:text-gray-300 uppercase tracking-widest">
                                        <span className="w-2.5 h-2.5 rounded-sm bg-[#3b82f6] shadow-[0_0_8px_rgba(59,130,246,0.6)]"></span> GMail
                                    </div>
                                    <div className="w-px h-3 bg-gray-300 dark:bg-gray-600"></div>
                                    <div className="flex items-center gap-2 text-[11px] font-bold text-gray-600 dark:text-gray-300 uppercase tracking-widest">
                                        <span className="w-2.5 h-2.5 rounded-sm bg-[#a855f7] shadow-[0_0_8px_rgba(168,85,247,0.6)]"></span> Brevo
                                    </div>
                                    <div className="w-px h-3 bg-gray-300 dark:bg-gray-600"></div>
                                    <div className="flex items-center gap-2 text-[11px] font-bold text-gray-600 dark:text-gray-300 uppercase tracking-widest">
                                        <span className="w-2.5 h-2.5 rounded-sm bg-[#10b981] shadow-[0_0_8px_rgba(16,185,129,0.6)]"></span> Resend
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="relative h-64 w-full mt-4">
                            {/* Y-Axis Grid Lines */}
                            <div className="absolute inset-0 flex flex-col justify-between pt-2 pb-6 pointer-events-none z-0">
                                {[0, 1, 2, 3].map((_, i) => (
                                    <div key={i} className="w-full border-t border-gray-100 dark:border-gray-800 flex-1 relative">
                                        {i === 0 && (() => {
                                            const activeData = smtpGraphView === 'days' ? data.graphs?.dailySmtp : data.graphs?.monthlySmtp;
                                            const max = Math.max(...(activeData?.map((d: any) => d.smtp1 + d.smtp2 + (d.smtp3 || 0)) || []), 1);
                                            return <span className="absolute -top-3 -left-2 bg-white dark:bg-gray-900 text-[10px] font-bold text-gray-400 px-1">{max}</span>;
                                        })()}
                                    </div>
                                ))}
                                <div className="w-full border-t border-solid border-gray-300 dark:border-gray-700 relative">
                                    <span className="absolute -top-3 -left-2 bg-white dark:bg-gray-900 text-[10px] font-bold text-gray-400 px-1">0</span>
                                </div>
                            </div>

                            {/* Chart Data Render */}
                            <div className="absolute inset-0 pt-2 pb-6 flex items-end gap-[2px] sm:gap-1 z-10 px-4">
                                {(() => {
                                    const activeData = smtpGraphView === 'days' ? data.graphs?.dailySmtp : data.graphs?.monthlySmtp;
                                    if (!activeData || activeData.length === 0) return null;
                                    
                                    const maxCount = Math.max(...activeData.map((d: any) => d.smtp1 + d.smtp2 + (d.smtp3 || 0)), 1);
                                    
                                    return activeData.map((d: any, i: number) => {
                                        const total = d.smtp1 + d.smtp2 + (d.smtp3 || 0);
                                        const s1h = (d.smtp1 / maxCount) * 100;
                                        const s2h = (d.smtp2 / maxCount) * 100;
                                        const s3h = ((d.smtp3 || 0) / maxCount) * 100;
                                        
                                        return (
                                        <div key={i} className="flex-1 flex flex-col justify-end group/bar h-full relative cursor-pointer">
                                            {/* Hover highlight pillar */}
                                            <div className="absolute inset-0 bg-gray-50/50 dark:bg-gray-800/30 opacity-0 group-hover/bar:opacity-100 rounded-t-lg transition-opacity -mx-0.5"></div>

                                            {/* Tooltip */}
                                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 pointer-events-none opacity-0 group-hover/bar:opacity-100 transition-all duration-200 z-50">
                                                <div className="bg-gray-900 dark:bg-black backdrop-blur-md text-white text-[11px] font-bold p-3 rounded-xl shadow-2xl border border-gray-700 whitespace-nowrap min-w-[120px]">
                                                    <div className="text-gray-400 text-center text-[9px] uppercase tracking-widest mb-2 border-b border-gray-800 pb-1">{('dateId' in d) ? d.dateId : d._id}</div>
                                                    <div className="flex items-center justify-between gap-4 mb-1"><span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-blue-500"></span> Primary</span> <span>{d.smtp1}</span></div>
                                                    <div className="flex items-center justify-between gap-4 mb-1"><span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-purple-500"></span> Secondary</span> <span>{d.smtp2}</span></div>
                                                    <div className="flex items-center justify-between gap-4 mb-2"><span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-emerald-500"></span> Tertiary</span> <span>{d.smtp3 || 0}</span></div>
                                                    <div className="pt-1.5 border-t border-gray-700 flex justify-between text-indigo-300"><span>Total</span> <span>{total}</span></div>
                                                    
                                                    {/* Downward arrow */}
                                                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-black"></div>
                                                </div>
                                            </div>

                                            {/* Stacked bars with slight space between them */}
                                            <div className="w-full relative z-10 flex flex-col justify-end gap-[1px]" style={{ height: `${s1h + s2h + s3h}%`, minHeight: '4px' }}>
                                                {s3h > 0 && <div className="w-full bg-emerald-500 hover:bg-emerald-400 transition-colors rounded-t-[3px] shadow-[0_0_10px_rgba(16,185,129,0.3)]" style={{ height: `${(s3h / (s1h + s2h + s3h)) * 100}%` }}></div>}
                                                {s2h > 0 && <div className={`w-full bg-purple-500 hover:bg-purple-400 transition-colors shadow-[0_0_10px_rgba(168,85,247,0.3)] ${s3h === 0 ? 'rounded-t-[3px]' : ''}`} style={{ height: `${(s2h / (s1h + s2h + s3h)) * 100}%` }}></div>}
                                                {s1h > 0 && <div className="w-full bg-blue-500 hover:bg-blue-400 transition-colors shadow-[0_0_10px_rgba(59,130,246,0.3)] rounded-[2px]" style={{ height: `${(s1h / (s1h + s2h + s3h)) * 100}%` }}></div>}
                                            </div>
                                        </div>
                                    )});
                                })()}
                            </div>
                        </div>

                        {/* X-Axis labels */}
                        {data.graphs && (data.graphs.dailySmtp?.length > 0 || data.graphs.monthlySmtp?.length > 0) && (
                            <div className="flex justify-between mt-2 text-[10px] font-black text-gray-400 uppercase tracking-widest px-4 border-t border-transparent pt-3 z-10 relative">
                                <span>{smtpGraphView === 'days' ? data.graphs.dailySmtp[0]?.dateId : data.graphs.monthlySmtp[0]?._id}</span>
                                <span>{smtpGraphView === 'days' ? data.graphs.dailySmtp.slice(-1)[0]?.dateId : data.graphs.monthlySmtp.slice(-1)[0]?._id}</span>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}


