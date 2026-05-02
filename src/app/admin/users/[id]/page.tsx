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
    const price = type === 'product' ? `₹${item.price}` : `₹${item.price}${item.priceUnit ? `/${item.priceUnit}` : ''}`;

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
    const [activeTab, setActiveTab] = useState<'products' | 'services'>('products');
    const router = useRouter();

    useEffect(() => {
        fetchUserDetail(productPage, servicePage);
    }, []);

    useEffect(() => {
        if (data) {
            fetchUserDetail(productPage, servicePage, true);
        }
    }, [productPage, servicePage]);

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
                                className="text-sm border border-gray-200 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-1.5 bg-white"
                                value={user.role}
                                onChange={(e) => handleRoleUpdate(e.target.value)}
                            >
                                <option value="user">User</option>
                                <option value="admin">Admin</option>
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
                <div id="admin-user-listings" className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl w-fit mb-6">
                    <button
                        onClick={() => setActiveTab('products')}
                        className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                            activeTab === 'products'
                                ? 'bg-white text-indigo-700 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                        </svg>
                        Products
                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                            activeTab === 'products' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-200 text-gray-500'
                        }`}>
                            {stats?.totalProducts ?? 0}
                        </span>
                    </button>
                    <button
                        onClick={() => setActiveTab('services')}
                        className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                            activeTab === 'services'
                                ? 'bg-white text-indigo-700 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        Services
                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                            activeTab === 'services' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-200 text-gray-500'
                        }`}>
                            {stats?.totalServices ?? 0}
                        </span>
                    </button>
                </div>

                {/* Products Panel */}
                {activeTab === 'products' && (
                    <div className="mb-10">
                        {products.length === 0 ? (
                            <div className="text-center py-16 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-100">
                                <p className="text-gray-500 text-sm">No products listed.</p>
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
                            <div className="text-center py-16 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-100">
                                <p className="text-gray-500 text-sm">No services offered.</p>
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

                {/* Reviews Section */}
                <div id="reviews-section">
                    <ReviewSection targetId={user._id} targetName={user.name} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 transition-colors" />
                </div>

            </div>
        </div>
    );
}
