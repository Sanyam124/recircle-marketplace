'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Loader from '@/components/Loader';

export default function AdminCommunitiesPage() {
    const [communities, setCommunities] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [formData, setFormData] = useState({ name: '', emailDomains: '', description: '' });

    useEffect(() => {
        fetchCommunities();
    }, []);

    const fetchCommunities = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/admin/communities');
            if (res.ok) {
                const data = await res.json();
                setCommunities(data.communities || []);
            }
        } catch (error) {
            console.error('Failed to fetch communities', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        const domains = formData.emailDomains.split(',').map(d => d.trim()).filter(Boolean);
        
        try {
            const res = await fetch('/api/admin/communities', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...formData, emailDomains: domains }),
            });
            if (res.ok) {
                const data = await res.json();
                setCommunities([data.community, ...communities]);
                setIsAdding(false);
                setFormData({ name: '', emailDomains: '', description: '' });
            } else {
                const err = await res.json();
                alert(err.error || 'Failed to create');
            }
        } catch (error) {
            console.error('Failed to create', error);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this community?')) return;
        try {
            const res = await fetch(`/api/admin/communities?id=${id}`, { method: 'DELETE' });
            if (res.ok) {
                setCommunities(communities.filter(c => c._id !== id));
            }
        } catch (error) {
            console.error('Failed to delete', error);
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Campus Circles</h1>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Define and manage university communities and their email domains.</p>
                </div>
                <button
                    onClick={() => setIsAdding(!isAdding)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold shadow-sm transition-all"
                >
                    {isAdding ? 'Cancel' : 'Add New Circle'}
                </button>
            </div>

            {isAdding && (
                <div className="mb-8 p-6 bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/30 rounded-2xl animate-in slide-in-from-top-4 duration-300">
                    <form onSubmit={handleCreate} className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Circle Name</label>
                            <input
                                required
                                type="text"
                                className="w-full rounded-lg border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm p-2.5"
                                placeholder="e.g. Parul University"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email Domains (comma separated)</label>
                            <input
                                required
                                type="text"
                                className="w-full rounded-lg border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm p-2.5"
                                placeholder="e.g. paruluniversity.ac.in, student.pu.ac.in"
                                value={formData.emailDomains}
                                onChange={e => setFormData({ ...formData, emailDomains: e.target.value })}
                            />
                        </div>
                        <div className="sm:col-span-2">
                             <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description (Optional)</label>
                             <textarea
                                className="w-full rounded-lg border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm p-2.5"
                                rows={2}
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                             />
                        </div>
                        <div className="sm:col-span-2 flex justify-end">
                             <button type="submit" className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold shadow-md hover:bg-indigo-700 transition-all">
                                Create Community Circle
                             </button>
                        </div>
                    </form>
                </div>
            )}

            {loading ? (
                <Loader />
            ) : communities.length === 0 ? (
                <div className="text-center py-20 bg-gray-50 dark:bg-gray-800 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                    <p className="text-gray-500 dark:text-gray-400">No campus circles created yet.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {communities.map((comm) => (
                        <div key={comm._id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm hover:shadow-md transition-all group">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                                </div>
                                <button
                                    onClick={() => handleDelete(comm._id)}
                                    className="p-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{comm.name}</h3>
                            <div className="flex flex-wrap gap-2 mb-4">
                                {comm.emailDomains.map((domain: string) => (
                                    <span key={domain} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-[10px] font-mono border border-gray-200 dark:border-gray-600">
                                        @{domain}
                                    </span>
                                ))}
                            </div>
                            <div className="pt-4 border-t border-gray-50 dark:border-gray-700 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                                <span>Created {new Date(comm.createdAt).toLocaleDateString()}</span>
                                <span className={`flex items-center gap-1 ${comm.isActive ? 'text-green-500' : 'text-gray-400'}`}>
                                    <span className="w-2 h-2 rounded-full bg-current"></span>
                                    {comm.isActive ? 'Live' : 'Inactive'}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
