'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import Loader from '@/components/Loader';
import Link from 'next/link';
import PaginationControls from '@/components/PaginationControls';
import { confirmAction, showError, showSuccess } from '@/lib/confirm';

interface Order {
    _id: string;
    orderType: string;
    product: {
        _id: string;
        title: string;
        images: string[];
    } | null;
    service: {
        _id: string;
        title: string;
        images: string[];
    } | null;
    buyer: {
        name: string;
        email: string;
    };
    seller: {
        name: string;
        email: string;
    };
    totalAmount: number;
    status: string;
    disputeReason?: string;
    createdAt: string;
}

export default function AdminDisputesPage() {
    const { user, loading: authLoading } = useAuth();
    const [disputes, setDisputes] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => {
        if (!authLoading && user?.role === 'admin') {
            fetchDisputes();
        }
    }, [user, authLoading, page]);

    const fetchDisputes = async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/admin/disputes?page=${page}&limit=10`);
            if (res.ok) {
                const data = await res.json();
                setDisputes(data.disputes);
                setTotalPages(data.pagination?.totalPages || 1);
            }
        } catch (error) {
            console.error('Failed to fetch disputes', error);
        } finally {
            setLoading(false);
        }
    };

    const handleResolve = async (id: string, resolution: 'refund_buyer' | 'dismiss_dispute') => {
        const confirmed = await confirmAction({
            title: 'Resolve Dispute?',
            text: `Are you sure you want to ${resolution === 'refund_buyer' ? 'cancel this reservation' : 'mark this as completed'}?`,
            icon: 'question',
            confirmButtonText: 'Confirm Resolution'
        });
        if (!confirmed) return;

        try {
            const res = await fetch(`/api/orders/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'resolve_dispute', resolution })
            });

            if (res.ok) {
                showSuccess('Resolved', 'Dispute Resolved Successfully');
                fetchDisputes(); // Refresh
            } else {
                const data = await res.json();
                showError('Action Failed', data.error || 'Failed to resolve');
            }
        } catch (error) {
            console.error('Error resolving dispute', error);
        }
    };

    if (authLoading || loading) return <Loader />;

    if (!user || user.role !== 'admin') {
        return <div className="p-8 text-center text-red-500">Access Denied</div>;
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <h1 id="disputes-top" className="text-2xl font-bold text-gray-900 mb-6">Dispute Resolution</h1>

            {disputes.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
                    No pending disputes found.
                </div>
            ) : (
                <div className="space-y-4">
                    {disputes.map((order) => (
                        <div key={order._id} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex flex-col md:flex-row justify-between gap-4">
                                
                                {/* Info Section */}
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-700">
                                            {order.status.replace('_', ' ')}
                                        </span>
                                        <span className="text-sm text-gray-500">Ordered on {new Date(order.createdAt).toLocaleDateString()}</span>
                                    </div>
                                    
                                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                                        {order.orderType === 'Service_Appointment' ? order.service?.title : order.product?.title}
                                    </h3>
                                    
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 text-sm">
                                        <div>
                                            <p className="font-medium text-gray-700">Buyer (Complainant)</p>
                                            <p className="text-gray-600">{order.buyer.name} ({order.buyer.email})</p>
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-700">Provider (Defendant)</p>
                                            <p className="text-gray-600">{order.seller.name} ({order.seller.email})</p>
                                        </div>
                                    </div>

                                    <div className="mt-4 bg-red-50 p-3 rounded-md border border-red-100">
                                        <p className="font-medium text-red-800 text-sm">Dispute Reason:</p>
                                        <p className="text-red-700 mt-1 italic">"{order.disputeReason}"</p>
                                    </div>
                                </div>

                                {/* Actions Section */}
                                <div className="flex flex-col justify-center gap-3 md:border-l md:pl-6 border-gray-100 min-w-[200px]">
                                    <div className="text-center mb-2">
                                        <p className="text-sm text-gray-500">Original Price</p>
                                        <p className="text-xl font-bold text-gray-900">₹{order.totalAmount}</p>
                                    </div>
                                    
                                    <button
                                        onClick={() => handleResolve(order._id, 'refund_buyer')}
                                        className="w-full py-2 px-4 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md shadow-sm transition-colors"
                                    >
                                        Cancel Reservation
                                    </button>
                                    <button
                                        onClick={() => handleResolve(order._id, 'dismiss_dispute')}
                                        className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-md shadow-sm transition-colors"
                                    >
                                        Mark as Completed
                                    </button>
                                </div>

                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Pagination Controls */}
            <PaginationControls page={page} totalPages={totalPages} onPageChange={setPage} scrollTargetId="disputes-top" />
        </div>
    );
}
