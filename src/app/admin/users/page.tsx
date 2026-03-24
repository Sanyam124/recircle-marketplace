'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Loader from '@/components/Loader';

export default function AdminUsersPage() {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalUsers, setTotalUsers] = useState(0);
    const [updatingRole, setUpdatingRole] = useState<string | null>(null);
    const [communities, setCommunities] = useState<any[]>([]);
    const [showCommunityModal, setShowCommunityModal] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [selectedCommunityId, setSelectedCommunityId] = useState('');

    useEffect(() => {
        setPage(1);
    }, [search, roleFilter]);

    useEffect(() => {
        fetchUsers();
    }, [page, search, roleFilter]);

    useEffect(() => {
        const fetchCommunities = async () => {
            const res = await fetch('/api/admin/communities');
            if (res.ok) {
                const data = await res.json();
                setCommunities(data.communities || []);
            }
        };
        fetchCommunities();
    }, []);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const query = new URLSearchParams();
            if (search) query.append('search', search);
            if (roleFilter) query.append('role', roleFilter);
            query.append('page', String(page));
            query.append('limit', '20');

            const res = await fetch(`/api/admin/users?${query.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setUsers(data.users);
                setTotalPages(data.pagination?.totalPages || 1);
                setTotalUsers(data.pagination?.totalUsers || 0);
            }
        } catch (error) {
            console.error('Failed to fetch users', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRoleUpdate = async (userId: string, newRole: string, communityId?: string) => {
        // If selecting verifier without a community assignment yet, show modal
        if (newRole === 'verifier' && !communityId) {
            setSelectedUserId(userId);
            setShowCommunityModal(true);
            return;
        }

        if (!confirm(`Change this user's role to "${newRole}"?`)) return;
        setUpdatingRole(userId);
        try {
            const res = await fetch('/api/admin/users', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, role: newRole, communityId }),
            });
            if (res.ok) {
                setUsers(prev => prev.map(u => u._id === userId ? { ...u, role: newRole } : u));
                setShowCommunityModal(false);
                setSelectedCommunityId('');
            } else {
                const json = await res.json();
                alert(json.error || 'Failed to update role');
            }
        } catch (error) {
            console.error('Update failed', error);
        } finally {
            setUpdatingRole(null);
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 transition-colors duration-300">
            <div className="sm:flex sm:items-center mb-6">
                <div className="sm:flex-auto">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">User Management</h1>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{totalUsers} total users registered.</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <input
                    type="text"
                    placeholder="Search by name or email..."
                    className="block w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm p-2.5 transition-colors"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
                <select
                    className="block w-full sm:w-48 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm p-2.5 transition-colors"
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                    <option value="verifier">Verifier</option>
                </select>
            </div>

            {/* User Cards */}
            {loading ? (
                <Loader />
            ) : users.length === 0 ? (
                <div className="text-center py-16 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border-2 border-dashed border-gray-100 dark:border-gray-800 transition-colors">
                    <p className="text-gray-500 dark:text-gray-400 text-sm">No users found.</p>
                </div>
            ) : (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-colors">
                    <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-900/50 transition-colors">
                            <tr>
                                <th className="py-3.5 pl-6 pr-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">User</th>
                                <th className="px-3 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Username</th>
                                <th className="px-3 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                                <th className="px-3 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Role</th>
                                <th className="px-6 py-3.5 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                            {users.map((user) => (
                                <tr key={user._id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors">
                                    {/* Name + Email */}
                                    <td className="py-4 pl-6 pr-3">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-sm border border-indigo-200 dark:border-indigo-800 flex-shrink-0 transition-colors">
                                                {user.name?.charAt(0) || 'U'}
                                            </div>
                                            <div>
                                                <Link
                                                    href={`/profile/${user._id}`}
                                                    className="font-semibold text-gray-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors text-sm"
                                                >
                                                    {user.name}
                                                </Link>
                                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 transition-colors">{user.email}</p>
                                            </div>
                                        </div>
                                    </td>

                                    {/* Username */}
                                    <td className="px-3 py-4 text-sm text-indigo-500 dark:text-indigo-400 font-mono transition-colors">
                                        @{user.username || 'not_set'}
                                    </td>

                                    {/* Verified status */}
                                    <td className="px-3 py-4 transition-colors">
                                        {user.isVerified ? (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-100 dark:border-green-800 transition-colors">
                                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" /></svg>
                                                Verified
                                            </span>
                                        ) : (
                                            <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-800 transition-colors">
                                                Unverified
                                            </span>
                                        )}
                                    </td>

                                    {/* Role change — inline dropdown */}
                                    <td className="px-3 py-4">
                                        <select
                                            value={user.role}
                                            disabled={updatingRole === user._id}
                                            onChange={(e) => handleRoleUpdate(user._id, e.target.value)}
                                            className={`text-xs font-semibold rounded-lg border px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-colors cursor-pointer ${
                                                user.role === 'admin'
                                                    ? 'bg-purple-50 dark:bg-purple-900/30 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-400'
                                                    : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'
                                            } ${updatingRole === user._id ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        >
                                            <option value="user">User</option>
                                            <option value="admin">Admin</option>
                                            <option value="verifier">Verifier</option>
                                        </select>
                                    </td>

                                    {/* View Profile link */}
                                    <td className="px-6 py-4 text-right">
                                        <Link
                                            href={`/profile/${user._id}`}
                                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-100 dark:border-indigo-800 px-3 py-1.5 rounded-lg transition-colors"
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                            </svg>
                                            View Profile
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Community Assignment Modal */}
            {showCommunityModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-md p-8 shadow-2xl border border-gray-100 dark:border-gray-700 animate-in zoom-in slide-in-from-bottom-4 duration-300">
                        <div className="text-center mb-8">
                            <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                            </div>
                            <h3 className="text-2xl font-black text-gray-900 dark:text-white">Assign Community</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 font-medium">Select which campus this Verifier will manage.</p>
                        </div>
                        
                        <div className="space-y-6">
                            <div>
                                <label className="block text-[11px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2 ml-1">Select Campus Circle</label>
                                <select 
                                    value={selectedCommunityId}
                                    onChange={(e) => setSelectedCommunityId(e.target.value)}
                                    className="w-full rounded-2xl border-2 border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-4 py-3.5 text-sm font-bold text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-0 transition-all outline-none appearance-none"
                                >
                                    <option value="">-- Choose Community --</option>
                                    {communities.map((c) => (
                                        <option key={c._id} value={c._id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button 
                                    onClick={() => { setShowCommunityModal(false); setSelectedCommunityId(''); }}
                                    className="flex-1 px-6 py-3.5 rounded-2xl text-sm font-bold text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={() => handleRoleUpdate(selectedUserId!, 'verifier', selectedCommunityId)}
                                    disabled={!selectedCommunityId || updatingRole === selectedUserId}
                                    className="flex-1 px-6 py-3.5 rounded-2xl text-sm font-black uppercase tracking-widest text-white bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-700 dark:hover:bg-indigo-400 shadow-lg shadow-indigo-100 dark:shadow-none disabled:opacity-50 transition-all active:scale-95"
                                >
                                    {updatingRole === selectedUserId ? 'Assigning...' : 'Assign & Save'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
