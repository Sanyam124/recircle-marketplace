'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Loader from '@/components/Loader';

export default function VerifierDashboard() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [stats, setStats] = useState({ totalUsers: 0, pendingVerifications: 0, totalListings: 0, communityName: 'Your Campus' });
    const [loading, setLoading] = useState(true);
    const [requests, setRequests] = useState<any[]>([]);
    const [processingId, setProcessingId] = useState<string | null>(null);

    const fetchStats = async () => {
        try {
            const res = await fetch('/api/verifier/stats');
            if (res.ok) {
                const data = await res.json();
                setStats(data.stats);
            }
        } catch (error) {
            console.error('Failed to fetch verifier stats', error);
        }
    };

    const fetchRequests = async () => {
        try {
            const res = await fetch('/api/verifier/requests');
            if (res.ok) {
                const data = await res.json();
                setRequests(data.requests || []);
            }
        } catch (error) {
            console.error('Failed to fetch verifier requests', error);
        }
    };

    const handleDecision = async (id: string, status: 'Approved' | 'Rejected') => {
        try {
            setProcessingId(id);
            const res = await fetch(`/api/verifier/requests/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status }),
            });
            if (res.ok) {
                fetchRequests();
                fetchStats();
            } else {
                const json = await res.json();
                alert(json.error || 'Failed to update request');
            }
        } catch (error) {
            console.error('Decision failed', error);
        } finally {
            setProcessingId(null);
        }
    };

    useEffect(() => {
        if (!authLoading && (!user || user.role !== 'verifier')) {
            router.push('/');
        }
    }, [user, authLoading, router]);

    useEffect(() => {
        const loadDashboardData = async () => {
            if (user?.role === 'verifier') {
                try {
                    setLoading(true);
                    await Promise.all([fetchStats(), fetchRequests()]);
                } catch (error) {
                    console.error('Error loading dashboard data', error);
                } finally {
                    setLoading(false);
                }
            }
        };
        loadDashboardData();
    }, [user]);

    if (authLoading || loading) return <Loader fullScreen />;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 transition-colors duration-300">
            <div className="flex justify-between items-center mb-10">
                <div>
                   <h1 className="text-3xl font-black text-gray-900 dark:text-white border-l-4 border-indigo-600 pl-4 transition-colors">Verifier Dashboard</h1>
                   <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 font-medium italic transition-colors">Campus: <span className="text-indigo-600 dark:text-indigo-400 underline underline-offset-4">{stats.communityName}</span></p>
                </div>
                <div className="bg-white dark:bg-gray-800 px-4 py-2 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-2 transition-colors">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    <span className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-widest">Officer Active</span>
                </div>
            </div>

            {/* Quick Stat Tiles */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                <div className="bg-indigo-600 p-8 rounded-3xl text-white shadow-xl shadow-indigo-100 dark:shadow-none hover:scale-[1.02] transition-transform duration-300">
                    <p className="text-xs uppercase font-black tracking-widest opacity-70 mb-1">Campus Residents</p>
                    <p className="text-5xl font-black">{stats.totalUsers}</p>
                    <p className="mt-4 text-[11px] font-bold">Total students in your circle</p>
                </div>
                <div className="bg-emerald-500 p-8 rounded-3xl text-white shadow-xl shadow-emerald-100 dark:shadow-none hover:scale-[1.02] transition-transform duration-300">
                    <p className="text-xs uppercase font-black tracking-widest opacity-70 mb-1">Verification Queue</p>
                    <p className="text-5xl font-black">{stats.pendingVerifications || requests.length}</p>
                    <p className="mt-4 text-[11px] font-bold">Students waiting for approval</p>
                </div>
                <div className="bg-white dark:bg-gray-900/50 p-8 rounded-3xl text-gray-900 dark:text-white border border-gray-100 dark:border-gray-700 shadow-sm border-b-4 border-b-indigo-500 hover:scale-[1.02] transition-all duration-300">
                    <p className="text-xs uppercase font-black tracking-widest text-gray-400 dark:text-gray-500 mb-1">Active Listings</p>
                    <p className="text-5xl font-black">{stats.totalListings}</p>
                    <p className="mt-4 text-[11px] font-bold text-gray-500 dark:text-gray-400">Listed across your community</p>
                </div>
            </div>

            {/* Verification Queue Section */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden transition-colors">
                <div className="px-8 py-6 border-b border-gray-50 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-900/50 flex justify-between items-center transition-colors">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Active Queue ({requests.length})</h3>
                    <button 
                        onClick={fetchRequests}
                        className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors uppercase tracking-widest"
                    >
                        Refresh Queue
                    </button>
                </div>

                {requests.length === 0 ? (
                    <div className="p-12 text-center">
                        <div className="bg-gray-50 dark:bg-gray-900/50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-dashed border-gray-200 dark:border-gray-700 transition-colors">
                            <svg className="w-8 h-8 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                        </div>
                        <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2 transition-colors">Queue is Empty</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto transition-colors">Either all residents are auto-verified by email, or you've processed all manual requests. Good job!</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
                        {requests.map(request => (
                            <div key={request._id} className="p-8 hover:bg-gray-50/50 dark:hover:bg-gray-900/30 transition-colors flex flex-col md:flex-row gap-8 items-start">
                                {/* Student Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="h-12 w-12 rounded-2xl bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-black border border-indigo-200 dark:border-indigo-800 flex-shrink-0 text-lg">
                                            {request.user?.name?.charAt(0) || 'U'}
                                        </div>
                                        <div>
                                            <p className="text-lg font-black text-gray-900 dark:text-white leading-tight">{request.user?.name}</p>
                                            <p className="text-sm font-bold text-indigo-500">@{request.user?.username}</p>
                                        </div>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 mb-4 inline-block">
                                        <p className="text-[10px] font-black uppercase text-gray-400 mb-1 tracking-widest">Email for Verification</p>
                                        <p className="text-sm font-bold text-gray-700 dark:text-gray-300">{request.user?.email}</p>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium italic">Requested on {new Date(request.createdAt).toLocaleDateString()}</p>
                                </div>

                                {/* ID Proof Image */}
                                <div className="w-full md:w-64 flex-shrink-0 group relative overflow-hidden rounded-2xl border-4 border-gray-100 dark:border-gray-700 shadow-lg">
                                    <img 
                                        src={request.idProof} 
                                        alt="ID Proof" 
                                        className="w-full aspect-[4/3] object-cover transition-transform duration-500 group-hover:scale-110 cursor-zoom-in"
                                        onClick={() => window.open(request.idProof, '_blank')}
                                    />
                                    <div className="absolute inset-x-0 bottom-0 bg-black/60 backdrop-blur-sm p-2 text-center translate-y-full group-hover:translate-y-0 transition-transform">
                                        <p className="text-white text-[10px] font-black tracking-widest uppercase">Click to Enlarge</p>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="w-full md:w-48 flex flex-col gap-3">
                                    <button
                                        disabled={processingId === request._id}
                                        onClick={() => handleDecision(request._id, 'Approved')}
                                        className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-emerald-100 dark:shadow-none transition-all active:scale-95 disabled:opacity-50"
                                    >
                                        {processingId === request._id ? 'Processing...' : 'Approve Resident'}
                                    </button>
                                    <button
                                        disabled={processingId === request._id}
                                        onClick={() => handleDecision(request._id, 'Rejected')}
                                        className="w-full py-3.5 bg-white dark:bg-transparent border-2 border-red-500 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-2xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50"
                                    >
                                        Reject Request
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
