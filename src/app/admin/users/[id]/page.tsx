'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Loader from '@/components/Loader';
import Link from 'next/link';
import ReviewSection from '@/components/ReviewSection';
import { confirmAction, showError, showSuccess } from '@/lib/confirm';

function PaginationControls({ page, totalPages, onPageChange, scrollTargetId }: { page: number; totalPages: number; onPageChange: (p: number) => void; scrollTargetId?: string }) {
    if (totalPages <= 1) return null;
    const go = (p: number) => {
        if (scrollTargetId) document.getElementById(scrollTargetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        onPageChange(p);
    };
    return (
        <div className="mt-4 flex items-center justify-center gap-2">
            <button
                onClick={() => go(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
                Previous
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).filter(p => Math.abs(p - page) <= 1).map(p => (
                <button
                    key={p}
                    onClick={() => go(p)}
                    className={`w-8 h-8 text-sm font-bold rounded-lg transition-colors ${p === page ? 'bg-indigo-600 text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                >
                    {p}
                </button>
            ))}
            <button
                onClick={() => go(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
                Next
            </button>
        </div>
    );
}


function ItemCard({ item, type }: { item: any; type: 'product' | 'service' }) {
    const href = type === 'product' ? `/products/${item._id}` : `/services/${item._id}`;
    const image = item.images?.[0];
    let priceStr = '';
    if (type === 'product') {
        const parts = [];
        if (item.forSell !== false && item.price !== undefined && item.price !== null) parts.push(`₹${item.price.toLocaleString()}`);
        if (item.forRent && item.rentPrice !== undefined && item.rentPrice !== null) parts.push(`₹${item.rentPrice.toLocaleString()} per ${item.rentUnit?.split(' ').pop() || 'item'}`);
        priceStr = parts.join(' / ');
    } else {
        priceStr = `₹${item.price?.toLocaleString()}${item.priceUnit ? ` per ${item.priceUnit.split(' ').pop()}` : ''}`;
    }
    const price = priceStr;

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden group hover:shadow-md transition-all duration-200">
            <div className="relative h-36 overflow-hidden bg-gray-50">
                {image ? (
                    <img src={image} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    </div>
                )}
                <div className={`absolute top-2 right-2 text-xs font-bold px-2 py-0.5 rounded-full ${
                    item.status === 'Available' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                }`}>
                    {item.status}
                </div>
            </div>
            <div className="p-3">
                <p className="text-sm font-semibold text-gray-900 truncate">{item.title}</p>
                <p className="text-xs text-indigo-600 font-bold mt-1">{price}</p>
                <div className="mt-2 flex items-center justify-between">
                    <span className="text-[10px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">{item.category}</span>
                    <Link href={href} target="_blank" className="text-xs text-indigo-600 hover:underline font-medium">View →</Link>
                </div>
            </div>
        </div>
    );
}

export default function AdminUserDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [productPage, setProductPage] = useState(1);
    const [servicePage, setServicePage] = useState(1);
    const [sectionLoading, setSectionLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'products' | 'services' | 'admin'>('products');
    const router = useRouter();

    // Verifier Assignment States
    const [communities, setCommunities] = useState<any[]>([]);
    const [showCommunityModal, setShowCommunityModal] = useState(false);
    const [selectedCommunityId, setSelectedCommunityId] = useState('');
    const [pendingRole, setPendingRole] = useState('');

    // Customizable User Fields
    const [editForm, setEditForm] = useState<any>({
        name: '',
        username: '',
        email: '',
        phone: '',
        isPhoneVerified: false,
        isVerified: false,
        isOnVacation: false,
        showOnlineStatus: false,
        compactView: false,
        notifyOffers: false,
        notifyMessages: false,
        bio: '',
        state: '',
        city: '',
        landmark: '',
        status: '',
        banDays: 7
    });
    const [savingFields, setSavingFields] = useState(false);

    useEffect(() => {
        fetchUserDetail(productPage, servicePage);
        fetchCommunities();
    }, []);

    useEffect(() => {
        if (data) {
            fetchUserDetail(productPage, servicePage, true);
        }
    }, [productPage, servicePage]);

    useEffect(() => {
        if (data?.user) {
            setEditForm({
                name: data.user.name || '',
                username: data.user.username || '',
                email: data.user.email || '',
                phone: data.user.phone || '',
                isPhoneVerified: data.user.isPhoneVerified || false,
                isVerified: data.user.isVerified || false,
                isOnVacation: data.user.isOnVacation || false,
                showOnlineStatus: data.user.showOnlineStatus !== false,
                compactView: data.user.compactView || false,
                notifyOffers: data.user.notifyOffers !== false,
                notifyMessages: data.user.notifyMessages !== false,
                bio: data.user.bio || '',
                state: data.user.state || '',
                city: data.user.city || '',
                landmark: data.user.landmark || '',
                status: data.user.status || 'Active',
                banDays: 7
            });
        }
    }, [data]);

    const fetchCommunities = async () => {
        try {
            const res = await fetch('/api/admin/communities');
            if (res.ok) {
                const json = await res.json();
                setCommunities(json.communities || []);
            }
        } catch (error) {
            console.error('Failed to fetch communities', error);
        }
    };

    const fetchUserDetail = async (pPage = 1, sPage = 1, isPageChange = false) => {
        try {
            if (isPageChange) setSectionLoading(true);
            else setLoading(true);

            const res = await fetch(`/api/admin/users/${resolvedParams.id}?productPage=${pPage}&servicePage=${sPage}&limit=8`);
            if (res.ok) {
                const json = await res.json();
                setData(json);
            } else {
                showError('Load Error', 'Failed to load user');
                router.back();
            }
        } catch (error) {
            console.error('Failed to fetch user', error);
        } finally {
            setLoading(false);
            setSectionLoading(false);
        }
    };

    const handleRoleSelect = (newRole: string) => {
        if (newRole === 'verifier') {
            setPendingRole(newRole);
            setShowCommunityModal(true);
        } else {
            handleRoleUpdate(newRole);
        }
    };

    const handleRoleUpdate = async (newRole: string) => {
        const confirmed = await confirmAction({
            title: 'Change User Role?',
            text: `Are you sure you want to change role to ${newRole}?`,
            confirmButtonText: 'Change Role'
        });
        if (!confirmed) return;

        try {
            const res = await fetch('/api/admin/users', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: data.user._id, role: newRole })
            });

            if (res.ok) {
                showSuccess('Success', 'Role updated successfully');
                fetchUserDetail(productPage, servicePage);
            } else {
                const json = await res.json();
                showError('Update Failed', json.error || 'Failed to update role');
            }
        } catch (error) {
            console.error('Update failed', error);
        }
    };

    const handleVerifierAssign = async () => {
        if (!selectedCommunityId) return;
        try {
            const res = await fetch('/api/admin/users', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: data.user._id, role: 'verifier', communityId: selectedCommunityId })
            });

            if (res.ok) {
                showSuccess('Success', 'Verifier assigned and updated successfully');
                setShowCommunityModal(false);
                setSelectedCommunityId('');
                fetchUserDetail(productPage, servicePage);
            } else {
                const json = await res.json();
                showError('Update Failed', json.error || 'Failed to update role');
            }
        } catch (error) {
            console.error('Update failed', error);
        }
    };

    const saveUserFields = async () => {
        const confirmed = await confirmAction({
            title: 'Save User Modifications?',
            text: 'Are you sure you want to update this user\'s platform fields?',
            confirmButtonText: 'Yes, Save Changes'
        });
        if (!confirmed) return;

        setSavingFields(true);
        try {
            const res = await fetch(`/api/admin/users/${resolvedParams.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editForm)
            });
            if (res.ok) {
                showSuccess('Success', 'User fields updated successfully.');
                fetchUserDetail(productPage, servicePage);
            } else {
                const json = await res.json();
                showError('Update Failed', json.error || 'Failed to update fields');
            }
        } catch (error) {
            console.error('Failed to update fields', error);
            showError('Error', 'An error occurred while saving.');
        } finally {
            setSavingFields(false);
        }
    };

    if (loading) return <Loader />;
    if (!data) return <div>User not found</div>;

    const { user, products, services, reviews, pagination, stats } = data;
    const productPagination = pagination?.products;
    const servicePagination = pagination?.services;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <button onClick={() => router.back()} className="mb-6 text-indigo-600 hover:text-indigo-900 flex items-center gap-1 text-sm font-medium">
                ← Back to Users
            </button>

            {/* Profile Header Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-8 overflow-hidden">
                <div className="p-8 flex flex-col md:flex-row items-center md:items-start gap-6">

                    {/* Avatar */}
                    <div className="h-24 w-24 rounded-full bg-indigo-100 flex items-center justify-center text-5xl font-bold text-indigo-600 border border-indigo-200 flex-shrink-0 uppercase">
                        {user.name?.charAt(0) || 'U'}
                    </div>

                    {/* Info — mirrors public profile */}
                    <div className="text-center md:text-left flex-1">
                        <h1 className="text-3xl font-bold text-gray-900">{user.name}</h1>
                        <p className="text-indigo-500 font-mono text-sm mt-0.5">@{user.username || 'not_set'}</p>
                        <p className="text-gray-500 text-sm mt-1 capitalize">
                            {user.role} · Joined {new Date(user.createdAt).getFullYear()}
                        </p>
                        {user.bio && <p className="text-gray-600 text-sm mt-2 max-w-lg">{user.bio}</p>}
                        <div className="flex items-center justify-center md:justify-start gap-2 mt-3 flex-wrap">
                            <div className="flex items-center bg-yellow-50 px-3 py-1 rounded-full border border-yellow-100 text-sm">
                                <span className="text-yellow-500 mr-1">★</span>
                                <span className="font-bold text-yellow-800">{stats?.rating ?? '0.0'}</span>
                                <span className="text-gray-400 ml-1">({stats?.totalReviews ?? 0} reviews)</span>
                            </div>
                            {user.isVerified ? (
                                <span className="bg-green-50 px-3 py-1 rounded-full border border-green-100 text-xs text-green-700 font-medium flex items-center gap-1">
                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" /></svg>
                                    Verified
                                </span>
                            ) : (
                                <span className="bg-red-50 px-3 py-1 rounded-full border border-red-100 text-xs text-red-600 font-medium">Unverified</span>
                            )}
                            <span className={`px-3 py-1 rounded-full border text-xs font-semibold ${
                                user.role === 'admin' ? 'bg-purple-50 border-purple-200 text-purple-700' : 'bg-gray-50 border-gray-200 text-gray-600'
                            }`}>{user.role}</span>
                        </div>
                    </div>

                    {/* Admin Controls */}
                    <div className="flex flex-col items-start md:items-end gap-3 flex-shrink-0">
                        <div className="text-right">
                            <p className="text-xs text-gray-400 font-mono">{user.email}</p>
                            <p className="text-[10px] text-gray-300 font-mono mt-0.5">ID: {user._id}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <select
                                className="text-sm border border-gray-200 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-1.5 bg-white cursor-pointer"
                                value={user.role}
                                onChange={(e) => handleRoleSelect(e.target.value)}
                            >
                                <option value="user">User</option>
                                <option value="admin">Admin</option>
                                <option value="verifier">Verifier</option>
                            </select>
                            <span className="text-xs text-gray-400 italic">Change Role</span>
                        </div>
                    </div>
                </div>

                {/* Stats Row — identical to public profile */}
                <div className="border-t border-gray-100 px-6 py-4 grid grid-cols-3 gap-4 bg-gray-50/60">
                    <div className="text-center">
                        <p className="text-2xl font-bold text-indigo-600">{stats?.totalProducts ?? 0}</p>
                        <p className="text-xs text-gray-500 font-medium mt-0.5">Products</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                            {stats?.totalProductsAvailable ?? 0} available · {stats?.totalProductsSold ?? 0} sold
                        </p>
                    </div>
                    <div className="text-center">
                        <p className="text-2xl font-bold text-indigo-600">{stats?.totalServices ?? 0}</p>
                        <p className="text-xs text-gray-500 font-medium mt-0.5">Services</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{stats?.totalEnrollments ?? 0} enrollments</p>
                    </div>
                    <div className="text-center">
                        <p className="text-2xl font-bold text-indigo-600">{stats?.totalReviews ?? 0}</p>
                        <p className="text-xs text-gray-500 font-medium mt-0.5">Reviews</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{stats?.rating ?? '0.0'} ★</p>
                    </div>
                </div>
            </div>

            <div className={`transition-opacity duration-200 ${sectionLoading ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>

                {/* Tab Toggle */}
                <div id="admin-user-listings" className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl w-fit mb-6 transition-colors">
                    <button
                        onClick={() => setActiveTab('products')}
                        className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                            activeTab === 'products'
                                ? 'bg-white dark:bg-gray-700 text-indigo-700 dark:text-indigo-400 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                        }`}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                        </svg>
                        Products
                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                            activeTab === 'products' ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-400' : 'bg-gray-200 dark:bg-gray-800 text-gray-500'
                        }`}>
                            {stats?.totalProducts ?? 0}
                        </span>
                    </button>
                    <button
                        onClick={() => setActiveTab('services')}
                        className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                            activeTab === 'services'
                                ? 'bg-white dark:bg-gray-700 text-indigo-700 dark:text-indigo-400 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                        }`}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        Services
                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                            activeTab === 'services' ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-400' : 'bg-gray-200 dark:bg-gray-800 text-gray-500'
                        }`}>
                            {stats?.totalServices ?? 0}
                        </span>
                    </button>
                    <button
                        onClick={() => setActiveTab('admin')}
                        className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                            activeTab === 'admin'
                                ? 'bg-white dark:bg-gray-700 text-indigo-700 dark:text-indigo-400 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                        }`}
                    >
                        <span className="text-sm">⚙️</span>
                        Admin Controls
                    </button>
                </div>

                {/* Products Panel */}
                {activeTab === 'products' && (
                    <div className="mb-10">
                        {products.length === 0 ? (
                            <div className="text-center py-16 bg-gray-50 dark:bg-gray-800 rounded-2xl border-2 border-dashed border-gray-100 dark:border-gray-700">
                                <p className="text-gray-500 dark:text-gray-400 text-sm">No products listed.</p>
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                    {products.map((p: any) => (
                                        <ItemCard key={p._id} item={p} type="product" />
                                    ))}
                                </div>
                                <PaginationControls
                                    page={productPage}
                                    totalPages={productPagination?.totalPages || 1}
                                    onPageChange={(p) => setProductPage(p)}
                                    scrollTargetId="admin-user-listings"
                                />
                            </>
                        )}
                    </div>
                )}

                {/* Services Panel */}
                {activeTab === 'services' && (
                    <div className="mb-10">
                        {services.length === 0 ? (
                            <div className="text-center py-16 bg-gray-50 dark:bg-gray-800 rounded-2xl border-2 border-dashed border-gray-100 dark:border-gray-700">
                                <p className="text-gray-500 dark:text-gray-400 text-sm">No services offered.</p>
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                    {services.map((s: any) => (
                                        <ItemCard key={s._id} item={s} type="service" />
                                    ))}
                                </div>
                                <PaginationControls
                                    page={servicePage}
                                    totalPages={servicePagination?.totalPages || 1}
                                    onPageChange={(p) => setServicePage(p)}
                                    scrollTargetId="admin-user-listings"
                                />
                            </>
                        )}
                    </div>
                )}

                {/* Administrative Controls Panel */}
                {activeTab === 'admin' && (
                    <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 p-8 shadow-sm space-y-8 animate-in fade-in duration-300 transition-colors mb-10">
                        <div>
                            <h2 className="text-xl font-black text-gray-900 dark:text-white leading-tight">Administrative Override Control</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Superuser privilege: edit any user field, location data, or direct notification & online switches immediately.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            
                            {/* Moderation & Account Status Card */}
                            <div className="bg-gray-50/50 dark:bg-gray-900/50 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 space-y-4">
                                <h3 className="text-sm font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">🛡️ Moderation & Status</h3>
                                
                                <div>
                                    <label className="block text-[11px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1.5">Account Status</label>
                                    <select
                                        value={editForm.status}
                                        onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                                        className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm font-bold text-gray-900 dark:text-white focus:border-indigo-500 outline-none transition-colors"
                                    >
                                        <option value="Active">Active</option>
                                        <option value="Banned">Banned</option>
                                    </select>
                                </div>

                                {editForm.status === 'Banned' && (
                                    <div className="animate-in slide-in-from-top-2 duration-200">
                                        <label className="block text-[11px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1.5">Ban Duration (Days)</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="365"
                                            value={editForm.banDays}
                                            onChange={e => setEditForm({ ...editForm, banDays: Math.max(1, parseInt(e.target.value) || 1) })}
                                            className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm font-bold text-gray-900 dark:text-white focus:border-indigo-500 outline-none transition-colors"
                                            placeholder="e.g. 7"
                                        />
                                    </div>
                                )}

                                <div className="flex items-center justify-between pt-2">
                                    <div>
                                        <p className="text-sm font-bold text-gray-900 dark:text-white">ID Verification Status</p>
                                        <p className="text-xs text-gray-400 dark:text-gray-500">Mark account as campus-verified</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" className="sr-only peer" checked={editForm.isVerified} onChange={e => setEditForm({ ...editForm, isVerified: e.target.checked })} />
                                        <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600 dark:peer-checked:bg-indigo-500"></div>
                                    </label>
                                </div>

                                <div className="flex items-center justify-between pt-2">
                                    <div>
                                        <p className="text-sm font-bold text-gray-900 dark:text-white">Phone Verification Status</p>
                                        <p className="text-xs text-gray-400 dark:text-gray-500">Mark phone as verified</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" className="sr-only peer" checked={editForm.isPhoneVerified} onChange={e => setEditForm({ ...editForm, isPhoneVerified: e.target.checked })} />
                                        <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600 dark:peer-checked:bg-indigo-500"></div>
                                    </label>
                                </div>
                            </div>

                            {/* Platform Settings & Preferences Card */}
                            <div className="bg-gray-50/50 dark:bg-gray-900/50 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 space-y-4">
                                <h3 className="text-sm font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">⚙️ Settings & Privacy</h3>

                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-bold text-gray-900 dark:text-white">Vacation Mode</p>
                                        <p className="text-xs text-gray-400 dark:text-gray-500">Hide listings and set away status</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" className="sr-only peer" checked={editForm.isOnVacation} onChange={e => setEditForm({ ...editForm, isOnVacation: e.target.checked })} />
                                        <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600 dark:peer-checked:bg-indigo-500"></div>
                                    </label>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-bold text-gray-900 dark:text-white">Show Online Status</p>
                                        <p className="text-xs text-gray-400 dark:text-gray-500">Display presence to other members</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" className="sr-only peer" checked={editForm.showOnlineStatus} onChange={e => setEditForm({ ...editForm, showOnlineStatus: e.target.checked })} />
                                        <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600 dark:peer-checked:bg-indigo-500"></div>
                                    </label>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-bold text-gray-900 dark:text-white">Compact Chat View</p>
                                        <p className="text-xs text-gray-400 dark:text-gray-500">Simplify UI layout on mobile devices</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" className="sr-only peer" checked={editForm.compactView} onChange={e => setEditForm({ ...editForm, compactView: e.target.checked })} />
                                        <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600 dark:peer-checked:bg-indigo-500"></div>
                                    </label>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-bold text-gray-900 dark:text-white">Offer Alert Emails</p>
                                        <p className="text-xs text-gray-400 dark:text-gray-500">Receive notifications for deal status logs</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" className="sr-only peer" checked={editForm.notifyOffers} onChange={e => setEditForm({ ...editForm, notifyOffers: e.target.checked })} />
                                        <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600 dark:peer-checked:bg-indigo-500"></div>
                                    </label>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-bold text-gray-900 dark:text-white">Chat Message Emails</p>
                                        <p className="text-xs text-gray-400 dark:text-gray-500">Receive alert emails for direct chats</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" className="sr-only peer" checked={editForm.notifyMessages} onChange={e => setEditForm({ ...editForm, notifyMessages: e.target.checked })} />
                                        <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600 dark:peer-checked:bg-indigo-500"></div>
                                    </label>
                                </div>
                            </div>

                            {/* Profile Fields Card */}
                            <div className="bg-gray-50/50 dark:bg-gray-900/50 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 space-y-4 md:col-span-2">
                                <h3 className="text-sm font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">👤 User Profile Details</h3>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[11px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1.5">Full Name</label>
                                        <input
                                            type="text"
                                            value={editForm.name}
                                            onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                            className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm font-bold text-gray-900 dark:text-white focus:border-indigo-500 outline-none transition-colors"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1.5">Username</label>
                                        <input
                                            type="text"
                                            value={editForm.username}
                                            onChange={e => setEditForm({ ...editForm, username: e.target.value })}
                                            className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm font-bold text-gray-900 dark:text-white focus:border-indigo-500 outline-none transition-colors"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1.5">Email Address</label>
                                        <input
                                            type="email"
                                            value={editForm.email}
                                            onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                                            className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm font-bold text-gray-900 dark:text-white focus:border-indigo-500 outline-none transition-colors"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1.5">Phone Number</label>
                                        <input
                                            type="text"
                                            value={editForm.phone}
                                            onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                                            className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm font-bold text-gray-900 dark:text-white focus:border-indigo-500 outline-none transition-colors"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[11px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1.5">Bio</label>
                                    <textarea
                                        value={editForm.bio}
                                        onChange={e => setEditForm({ ...editForm, bio: e.target.value })}
                                        rows={3}
                                        className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm font-bold text-gray-900 dark:text-white focus:border-indigo-500 outline-none transition-colors"
                                    />
                                </div>
                            </div>

                            {/* Location Details Card */}
                            <div className="bg-gray-50/50 dark:bg-gray-900/50 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 space-y-4 md:col-span-2">
                                <h3 className="text-sm font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">📍 Location Coordinates</h3>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-[11px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1.5">Landmark / Hostel</label>
                                        <input
                                            type="text"
                                            value={editForm.landmark}
                                            onChange={e => setEditForm({ ...editForm, landmark: e.target.value })}
                                            className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm font-bold text-gray-900 dark:text-white focus:border-indigo-500 outline-none transition-colors"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1.5">City</label>
                                        <input
                                            type="text"
                                            value={editForm.city}
                                            onChange={e => setEditForm({ ...editForm, city: e.target.value })}
                                            className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm font-bold text-gray-900 dark:text-white focus:border-indigo-500 outline-none transition-colors"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1.5">State</label>
                                        <input
                                            type="text"
                                            value={editForm.state}
                                            onChange={e => setEditForm({ ...editForm, state: e.target.value })}
                                            className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm font-bold text-gray-900 dark:text-white focus:border-indigo-500 outline-none transition-colors"
                                        />
                                    </div>
                                </div>
                            </div>

                        </div>

                        <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-gray-700">
                            <button
                                onClick={saveUserFields}
                                disabled={savingFields}
                                className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-indigo-100"
                            >
                                {savingFields ? 'Saving modifications...' : 'Save User Modifications'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Reviews Section */}
                <div id="reviews-section">
                    <ReviewSection targetId={user._id} targetName={user.name} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 transition-colors" />
                </div>

            </div>

            {/* Community Assignment Modal for Verifiers */}
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
                                    className="w-full rounded-2xl border-2 border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-4 py-3.5 text-sm font-bold text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-0 transition-all outline-none appearance-none cursor-pointer"
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
                                    className="flex-1 px-6 py-3.5 rounded-2xl text-sm font-bold text-gray-500 dark:text-gray-400 hover:bg-gray-155 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleVerifierAssign}
                                    disabled={!selectedCommunityId}
                                    className="flex-1 px-6 py-3.5 rounded-2xl text-sm font-black uppercase tracking-widest text-white bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-700 dark:hover:bg-indigo-400 shadow-lg shadow-indigo-100 dark:shadow-none disabled:opacity-50 transition-all active:scale-95"
                                >
                                    Assign & Save
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
