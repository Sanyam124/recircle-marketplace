'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Loader from '@/components/Loader';

interface AnalyticsData {
    users: { total: number; verified: number; recentSignups: number };
    inventory: { 
        products: { total: number; active: number; sold: number; reserved: number };
        services: { total: number; active: number; inactive: number };
    };
    transactions: { 
        totalOrders: number; 
        productOrders: number; 
        serviceOrders: number; 
        grossVolume: number;
        completedOrders: number;
        completedProductOrders: number;
        completedServiceOrders: number;
        pendingOrders: number;
        pendingProductOrders: number;
        pendingServiceOrders: number;
        cancelledOrders: number;
        cancelledProductOrders: number;
        cancelledServiceOrders: number;
    };
    moderation: { openDisputes: number; pendingReports: number };
    activityStream: {
        latestUsers: any[];
        latestOrders: any[];
    };
}

export default function AdminDashboard() {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                const res = await fetch('/api/admin/analytics');
                if (!res.ok) {
                    if (res.status === 401 || res.status === 403) throw new Error("Unauthorized Access. Admin status required.");
                    throw new Error("Failed to load dashboard data");
                }
                const result = await res.json();
                setData(result);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchAnalytics();
    }, []);

    if (loading) return <Loader />;

    if (error) return (
        <div className="max-w-4xl mx-auto mt-12 p-6 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            <h2 className="text-xl font-bold mb-2">Access Denied</h2>
            <p>{error}</p>
        </div>
    );

    if (!data) return null;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                     <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl dark:text-white">
                        Admin Control Center
                     </h1>
                     <p className="mt-2 text-sm text-gray-500 max-w-2xl dark:text-gray-400">
                        Platform status, transaction metrics, and actionable items at a glance.
                     </p>
                </div>
            </div>

            {/* Top Level KPIs */}
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Platform Overview</h2>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 mb-8">
                {/* Total Users Card */}
                <div className="bg-white overflow-hidden shadow-sm rounded-xl border border-gray-100 dark:bg-gray-800 dark:border-gray-700 transition-all hover:shadow-md">
                    <div className="p-5">
                       <div className="flex items-center">
                          <div className="flex-shrink-0 bg-indigo-100 rounded-md p-3 dark:bg-indigo-900/40">
                             <svg className="h-6 w-6 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                             </svg>
                          </div>
                          <div className="ml-5 w-0 flex-1">
                             <dl>
                                <dt className="text-sm font-medium text-gray-500 truncate dark:text-gray-400">Total Registered Users</dt>
                                <dd className="flex items-baseline">
                                   <div className="text-2xl font-bold text-gray-900 dark:text-white">{data.users.total}</div>
                                   <div className="ml-2 flex items-baseline text-sm font-semibold text-green-600 group tooltip">
                                      +{data.users.recentSignups} this week
                                   </div>
                                </dd>
                             </dl>
                          </div>
                       </div>
                    </div>
                </div>

                {/* GTV Card */}
                <div className="bg-white overflow-hidden shadow-sm rounded-xl border border-gray-100 dark:bg-gray-800 dark:border-gray-700 transition-all hover:shadow-md">
                    <div className="p-5">
                       <div className="flex items-center">
                          <div className="flex-shrink-0 bg-green-100 rounded-md p-3 dark:bg-green-900/40">
                             <svg className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                             </svg>
                          </div>
                          <div className="ml-5 w-0 flex-1">
                             <dl>
                                <dt className="text-sm font-medium text-gray-500 truncate dark:text-gray-400">Total Trade Volume (GTV)</dt>
                                <dd className="flex items-baseline mb-1">
                                   <div className="text-2xl font-bold text-gray-900 dark:text-white">₹{data.transactions.grossVolume.toLocaleString()}</div>
                                </dd>
                                <dd className="text-xs text-gray-500 dark:text-gray-400">Sum of all completed orders.</dd>
                             </dl>
                          </div>
                       </div>
                    </div>
                </div>

                {/* Open Reports/Disputes */}
                <div className="bg-white overflow-hidden shadow-sm rounded-xl border border-gray-100 dark:bg-gray-800 dark:border-gray-700 transition-all hover:shadow-md">
                    <div className="p-5">
                       <div className="flex items-center">
                          <div className="flex-shrink-0 bg-red-100 rounded-md p-3 dark:bg-red-900/40">
                             <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                             </svg>
                          </div>
                          <div className="ml-5 w-0 flex-1">
                             <dl>
                                <dt className="text-sm font-medium text-gray-500 truncate dark:text-gray-400">Requires Attention</dt>
                                <dd className="flex items-baseline">
                                   <div className={`text-2xl font-bold ${data.moderation.openDisputes > 0 ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>
                                      {data.moderation.openDisputes + data.moderation.pendingReports}
                                   </div>
                                </dd>
                             </dl>
                          </div>
                       </div>
                    </div>
                </div>
            </div>

            {/* Order Metrics Section */}
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Order Distribution</h2>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4 mb-8">
                {/* Total Orders */}
                <div className="bg-white overflow-hidden shadow-sm rounded-xl border border-gray-100 dark:bg-gray-800 dark:border-gray-700 transition-all hover:shadow-md">
                    <div className="p-5">
                       <div className="flex items-center">
                          <div className="flex-shrink-0 bg-blue-100 rounded-md p-3 dark:bg-blue-900/40">
                             <svg className="h-6 w-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                             </svg>
                          </div>
                          <div className="ml-5 w-0 flex-1">
                             <dl>
                                <dt className="text-sm font-medium text-gray-500 truncate dark:text-gray-400">Total Orders</dt>
                                <dd className="flex items-baseline mb-1">
                                   <div className="text-2xl font-bold text-gray-900 dark:text-white">{data.transactions.totalOrders}</div>
                                </dd>
                                <dd className="text-xs text-gray-500 dark:text-gray-400">
                                   <span className="font-semibold text-indigo-600 dark:text-indigo-400">{data.transactions.productOrders}</span> Products • <span className="font-semibold text-orange-600 dark:text-orange-400">{data.transactions.serviceOrders}</span> Services 
                                </dd>
                             </dl>
                          </div>
                       </div>
                    </div>
                </div>

                {/* Completed Orders */}
                <div className="bg-white overflow-hidden shadow-sm rounded-xl border border-gray-100 dark:bg-gray-800 dark:border-gray-700 transition-all hover:shadow-md">
                    <div className="p-5">
                       <div className="flex items-center">
                          <div className="flex-shrink-0 bg-emerald-100 rounded-md p-3 dark:bg-emerald-900/40">
                             <svg className="h-6 w-6 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                             </svg>
                          </div>
                          <div className="ml-5 w-0 flex-1">
                             <dl>
                                <dt className="text-sm font-medium text-gray-500 truncate dark:text-gray-400">Completed</dt>
                                <dd className="flex items-baseline mb-1">
                                   <div className="text-2xl font-bold text-gray-900 dark:text-white">{data.transactions.completedOrders}</div>
                                </dd>
                                <dd className="text-xs text-gray-500 dark:text-gray-400">
                                   <span className="font-semibold text-indigo-600 dark:text-indigo-400">{data.transactions.completedProductOrders}</span> Products • <span className="font-semibold text-orange-600 dark:text-orange-400">{data.transactions.completedServiceOrders}</span> Services 
                                </dd>
                             </dl>
                          </div>
                       </div>
                    </div>
                </div>

                {/* Pending Orders */}
                <div className="bg-white overflow-hidden shadow-sm rounded-xl border border-gray-100 dark:bg-gray-800 dark:border-gray-700 transition-all hover:shadow-md">
                    <div className="p-5">
                       <div className="flex items-center">
                          <div className="flex-shrink-0 bg-amber-100 rounded-md p-3 dark:bg-amber-900/40">
                             <svg className="h-6 w-6 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                             </svg>
                          </div>
                          <div className="ml-5 w-0 flex-1">
                             <dl>
                                <dt className="text-sm font-medium text-gray-500 truncate dark:text-gray-400">Pending</dt>
                                <dd className="flex items-baseline mb-1">
                                   <div className="text-2xl font-bold text-gray-900 dark:text-white">{data.transactions.pendingOrders}</div>
                                </dd>
                                <dd className="text-xs text-gray-500 dark:text-gray-400">
                                   <span className="font-semibold text-indigo-600 dark:text-indigo-400">{data.transactions.pendingProductOrders}</span> Products • <span className="font-semibold text-orange-600 dark:text-orange-400">{data.transactions.pendingServiceOrders}</span> Services 
                                </dd>
                             </dl>
                          </div>
                       </div>
                    </div>
                </div>

                {/* Cancelled Orders */}
                <div className="bg-white overflow-hidden shadow-sm rounded-xl border border-gray-100 dark:bg-gray-800 dark:border-gray-700 transition-all hover:shadow-md">
                    <div className="p-5">
                       <div className="flex items-center">
                          <div className="flex-shrink-0 bg-rose-100 rounded-md p-3 dark:bg-rose-900/40">
                             <svg className="h-6 w-6 text-rose-600 dark:text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                             </svg>
                          </div>
                          <div className="ml-5 w-0 flex-1">
                             <dl>
                                <dt className="text-sm font-medium text-gray-500 truncate dark:text-gray-400">Cancelled</dt>
                                <dd className="flex items-baseline mb-1">
                                   <div className="text-2xl font-bold text-gray-900 dark:text-white">{data.transactions.cancelledOrders}</div>
                                </dd>
                                <dd className="text-xs text-gray-500 dark:text-gray-400">
                                   <span className="font-semibold text-indigo-600 dark:text-indigo-400">{data.transactions.cancelledProductOrders}</span> Products • <span className="font-semibold text-orange-600 dark:text-orange-400">{data.transactions.cancelledServiceOrders}</span> Services 
                                </dd>
                             </dl>
                          </div>
                       </div>
                    </div>
                </div>

            </div>

            {/* Secondary Layer */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column (Liquidity & Recent Users) */}
                <div className="lg:col-span-1 space-y-8">
                    {/* Product Inventory */}
                    <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-100 dark:border-gray-700 p-6">
                        <div className="flex items-center mb-4">
                            <div className="flex-shrink-0 bg-indigo-100 rounded-md p-2 dark:bg-indigo-900/40 mr-3">
                               <svg className="h-5 w-5 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                               </svg>
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Product Inventory</h3>
                        </div>
                        
                        <div className="mb-4">
                           <span className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400">{data.inventory.products.total}</span>
                           <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">Total Products Listed</span>
                        </div>
                        
                        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                            <li className="flex justify-between items-center px-1">
                                <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-emerald-500 mr-2"></span> Active:</span> 
                                <span className="font-bold text-gray-900 dark:text-white">{data.inventory.products.active}</span>
                            </li>
                            <li className="flex justify-between items-center px-1">
                                <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-blue-500 mr-2"></span> Sold:</span> 
                                <span className="font-bold text-gray-900 dark:text-white">{data.inventory.products.sold}</span>
                            </li>
                            <li className="flex justify-between items-center px-1">
                                <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-orange-400 mr-2"></span> Reserved:</span> 
                                <span className="font-bold text-gray-900 dark:text-white">{data.inventory.products.reserved}</span>
                            </li>
                        </ul>
                    </div>

                    {/* Service Catalog */}
                    <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-100 dark:border-gray-700 p-6">
                        <div className="flex items-center mb-4">
                            <div className="flex-shrink-0 bg-orange-100 rounded-md p-2 dark:bg-orange-900/40 mr-3">
                               <svg className="h-5 w-5 text-orange-600 dark:text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                               </svg>
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Service Catalog</h3>
                        </div>
                        
                        <div className="mb-4">
                           <span className="text-3xl font-extrabold text-orange-600 dark:text-orange-400">{data.inventory.services.total}</span>
                           <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">Total Services Offered</span>
                        </div>
                        
                        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                            <li className="flex justify-between items-center px-1">
                                <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-emerald-500 mr-2"></span> Active:</span> 
                                <span className="font-bold text-gray-900 dark:text-white">{data.inventory.services.active}</span>
                            </li>
                            <li className="flex justify-between items-center px-1">
                                <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-red-400 mr-2"></span> Inactive:</span> 
                                <span className="font-bold text-gray-900 dark:text-white">{data.inventory.services.inactive}</span>
                            </li>
                        </ul>
                    </div>

                    {/* Quick Access Links */}
                    <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-100 dark:border-gray-700 p-6">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Quick Links</h3>
                        <div className="flex flex-col space-y-2">
                            <Link href="/admin/users" className="flex items-center text-indigo-600 dark:text-indigo-400 font-medium hover:underline">
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                                Manage Users & Verifiers
                            </Link>
                            <Link href="/admin/communities" className="flex items-center text-emerald-600 dark:text-emerald-400 font-medium hover:underline">
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                                Manage Campus Circles
                            </Link>
                            <Link href="/explore" className="flex items-center text-gray-600 dark:text-gray-400 font-medium hover:underline">
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                Verify Marketplace Integrity
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Right Column (Activity Stream) */}
                <div className="lg:col-span-2 space-y-8">
                     {/* Recent Orders Flow */}
                     <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700">
                           <h3 className="text-lg font-bold text-gray-900 dark:text-white">Recent Transactions</h3>
                        </div>
                        <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
                           {data.activityStream.latestOrders.length > 0 ? (
                               data.activityStream.latestOrders.map((order, idx) => (
                                   <div key={idx} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                       <div>
                                           <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                              Order #{order._id.substring(order._id.length - 6)}
                                           </div>
                                           <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                              {order.buyer?.name} → {order.product?.title || order.service?.title || 'Unknown Item'}
                                           </div>
                                       </div>
                                       <div className="text-right">
                                           <div className="text-sm font-bold text-gray-900 dark:text-white">₹{order.totalAmount}</div>
                                           <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium mt-1 ${
                                               order.status === 'Completed' || order.status === 'Delivered' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                                               order.status === 'Cancelled' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                                               'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                                           }`}>
                                               {order.status}
                                           </span>
                                       </div>
                                   </div>
                               ))
                           ) : (
                               <div className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">No recent orders.</div>
                           )}
                        </div>
                     </div>

                     {/* Recent Signups */}
                     <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700">
                           <h3 className="text-lg font-bold text-gray-900 dark:text-white">Newest Users</h3>
                        </div>
                        <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
                            {data.activityStream.latestUsers.length > 0 ? (
                               data.activityStream.latestUsers.map((user, idx) => (
                                   <div key={idx} className="px-6 py-4 flex items-center hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                        <div className="h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-700 dark:text-indigo-400 font-bold">
                                            {user.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="ml-4">
                                            <div className="text-sm font-semibold text-gray-900 dark:text-white">{user.name}</div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400">{user.email} • Joined {new Date(user.createdAt).toLocaleDateString()}</div>
                                        </div>
                                        <div className="ml-auto">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                                                {user.role}
                                            </span>
                                        </div>
                                   </div>
                               ))
                            ) : (
                                <div className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">No users found.</div>
                            )}
                        </div>
                     </div>
                </div>
            </div>
        </div>
    );
}
