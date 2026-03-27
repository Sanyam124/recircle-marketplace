'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import Loader from '@/components/Loader';
import Link from 'next/link';

interface Report {
  _id: string;
  reporter: { name: string; username: string; email: string };
  targetUser: { _id: string; name: string; username: string; email: string };
  itemType: 'product' | 'service' | 'none';
  itemId?: string;
  reason: string;
  status: 'Pending' | 'Reviewed' | 'Dismissed';
  createdAt: string;
}

import PaginationControls from '@/components/PaginationControls';
const STATUS_COLORS: Record<string, string> = {
  Pending: 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
  Reviewed: 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800',
  Dismissed: 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700',
};

const TYPE_COLORS: Record<string, string> = {
  product: 'bg-blue-50 text-blue-700',
  service: 'bg-purple-50 text-purple-700',
  user: 'bg-orange-50 text-orange-700',
};

export default function AdminReportsPage() {
  const { user, loading: authLoading } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [statusFilter, setStatusFilter] = useState('Pending');
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && user?.role === 'admin') fetchReports();
  }, [user, authLoading, page, statusFilter]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/reports?page=${page}&status=${statusFilter}`);
      if (res.ok) {
        const data = await res.json();
        setReports(data.reports || []);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotalItems(data.pagination?.totalItems || 0);
      }
    } catch { console.error('Failed to load reports'); }
    finally { setLoading(false); }
  };

  const handleUpdate = async (id: string, status: 'Reviewed' | 'Dismissed') => {
    setUpdating(id);
    try {
      const res = await fetch(`/api/admin/reports/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) fetchReports();
    } catch { console.error('Update failed'); }
    finally { setUpdating(null); }
  };

  if (authLoading || loading) return <Loader />;
  if (!user || user.role !== 'admin') return <div className="p-8 text-center text-red-500">Access Denied</div>;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 transition-colors duration-300">
      <div id="reports-top" className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white transition-colors">Reports</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 transition-colors">{totalItems} total · Page {page} of {totalPages}</p>
        </div>
        {/* Status filter tabs */}
        <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl transition-colors">
          {['Pending', 'Reviewed', 'Dismissed', 'all'].map(s => (
            <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
              className={`px-3 py-1.5 text-sm font-semibold rounded-lg transition-colors capitalize ${statusFilter === s ? 'bg-white dark:bg-gray-700 text-indigo-700 dark:text-indigo-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white'}`}>
              {s === 'all' ? 'All' : s}
            </button>
          ))}
        </div>
      </div>

      {reports.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-800 transition-colors">
          <p className="text-gray-400 dark:text-gray-500 font-medium transition-colors">No {statusFilter === 'all' ? '' : statusFilter.toLowerCase()} reports.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map(report => (
            <div key={report._id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-start gap-4 flex-wrap">
                {/* Left */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className={`px-2 py-0.5 text-xs font-bold rounded-full border transition-colors ${STATUS_COLORS[report.status]}`}>
                      {report.status}
                    </span>
                    <span className={`px-2 py-0.5 text-xs font-bold rounded-full bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 transition-colors`}>
                      User
                    </span>
                    {report.itemType !== 'none' && (
                      <span className={`px-2 py-0.5 text-xs font-bold rounded-full transition-colors ${report.itemType === 'product' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'}`}>
                        {report.itemType} Context
                      </span>
                    )}
                    <span className="text-xs text-gray-400 dark:text-gray-500 transition-colors">{new Date(report.createdAt).toLocaleDateString()}</span>
                  </div>

                  <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1 transition-colors">
                    Reason: <span className="font-normal text-gray-700 dark:text-gray-300">{report.reason}</span>
                  </p>

                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 transition-colors">
                    Reported by <span className="font-medium text-gray-700 dark:text-gray-300">{report.reporter?.name}</span>
                    {' '}(@{report.reporter?.username || 'unknown'})
                  </p>

                  <p className="text-xs text-red-600 dark:text-red-400 font-medium transition-colors">
                    Target: <span className="font-bold text-red-700 dark:text-red-400">{report.targetUser?.name}</span> (@{report.targetUser?.username})
                  </p>

                  <div className="flex items-center gap-4 mt-2">
                    <Link
                      href={`/profile/${report.targetUser?._id}`}
                      className="inline-flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-bold transition-colors"
                      target="_blank"
                    >
                      Review User ↗
                    </Link>

                    {report.itemType !== 'none' && report.itemId && (
                       <Link
                         href={`/${report.itemType}s/${report.itemId}`}
                         className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 font-medium capitalize border-l dark:border-gray-700 pl-4 transition-colors"
                         target="_blank"
                       >
                         View {report.itemType} Context ↗
                       </Link>
                    )}
                  </div>
                </div>

                {/* Actions */}
                {report.status === 'Pending' && (
                  <div className="flex gap-2 flex-shrink-0 flex-wrap justify-end">
                    <button
                      onClick={() => handleUpdate(report._id, 'Reviewed')}
                      disabled={updating === report._id}
                      className="px-3 py-1.5 text-xs font-bold rounded-lg bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/60 disabled:opacity-50 transition-colors"
                    >
                      Mark Reviewed
                    </button>
                    <button
                      onClick={() => handleUpdate(report._id, 'Dismissed')}
                      disabled={updating === report._id}
                      className="px-3 py-1.5 text-xs font-bold rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
                    >
                      Dismiss
                    </button>
                    
                    {/* High-Stakes Actions */}
                    <button
                      onClick={async () => {
                         if (confirm(`Ban user ${report.targetUser?.name}? They will no longer be able to log in.`)) {
                             setUpdating(report._id);
                             const res = await fetch(`/api/admin/reports/${report._id}`, {
                                 method: 'PATCH',
                                 headers: { 'Content-Type': 'application/json' },
                                 body: JSON.stringify({ actionType: 'ban_user' })
                             });
                             if (res.ok) fetchReports();
                             setUpdating(null);
                         }
                      }}
                      disabled={updating === report._id}
                      className="px-3 py-1.5 text-xs font-bold rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-all shadow-sm"
                    >
                      Take Down User
                    </button>

                    {report.itemType !== 'none' && report.itemId && (
                      <button
                        onClick={async () => {
                           if (confirm(`Remove this ${report.itemType}? Data will be permanently deleted.`)) {
                               setUpdating(report._id);
                               const res = await fetch(`/api/admin/reports/${report._id}`, {
                                   method: 'PATCH',
                                   headers: { 'Content-Type': 'application/json' },
                                   body: JSON.stringify({ actionType: 'delete_content' })
                               });
                               if (res.ok) fetchReports();
                               setUpdating(null);
                           }
                        }}
                        disabled={updating === report._id}
                        className="px-3 py-1.5 text-xs font-bold rounded-lg bg-zinc-800 text-white hover:bg-black disabled:opacity-50 transition-all shadow-sm"
                      >
                        Remove Content
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <PaginationControls page={page} totalPages={totalPages} onPageChange={setPage} scrollTargetId="reports-top" />
    </div>
  );
}
