'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import Loader from '@/components/Loader';
import Link from 'next/link';
import { confirmAction } from '@/lib/confirm';

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

export default function AdminReportsPage() {
  const { user, loading: authLoading } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [statusFilter, setStatusFilter] = useState('Pending');
  const [updating, setUpdating] = useState<string | null>(null);

  // Ban Modal State
  const [banModalOpen, setBanModalOpen] = useState(false);
  const [banReportId, setBanReportId] = useState<string | null>(null);
  const [banTargetName, setBanTargetName] = useState('');
  const [banDays, setBanDays] = useState(7);
  const [banSendEmail, setBanSendEmail] = useState(true);

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

  const openBanModal = (reportId: string, targetName: string) => {
    setBanReportId(reportId);
    setBanTargetName(targetName);
    setBanDays(7);
    setBanSendEmail(true);
    setBanModalOpen(true);
  };

  const executeBan = async () => {
    if (!banReportId) return;
    setUpdating(banReportId);
    setBanModalOpen(false);
    try {
      const res = await fetch(`/api/admin/reports/${banReportId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionType: 'ban_user', banDays, sendEmail: banSendEmail }),
      });
      if (res.ok) fetchReports();
    } catch { console.error('Ban failed'); }
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
                    <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 transition-colors">
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
                    
                    {/* Ban User Button */}
                    <button
                      onClick={() => openBanModal(report._id, report.targetUser?.name || 'User')}
                      disabled={updating === report._id}
                      className="px-3 py-1.5 text-xs font-bold rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-all shadow-sm"
                    >
                      Ban User
                    </button>

                    {report.itemType !== 'none' && report.itemId && (
                      <button
                        onClick={async () => {
                           const confirmed = await confirmAction({
                               title: `Remove ${report.itemType}?`,
                               text: `Data will be permanently deleted. This action cannot be undone.`,
                               dangerMode: true,
                               confirmButtonText: 'Delete Content'
                           });

                           if (confirmed) {
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

      {/* ── Ban User Modal ────────────────────────────────────────── */}
      {banModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-md p-8 shadow-2xl border border-gray-100 dark:border-gray-700 animate-in zoom-in slide-in-from-bottom-4 duration-300">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
              </div>
              <h3 className="text-2xl font-black text-gray-900 dark:text-white">Ban {banTargetName}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 font-medium">Choose the ban duration and whether to notify the user via email.</p>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2 ml-1">Ban Duration (Days)</label>
                <div className="flex gap-2 mb-3">
                  {[1, 3, 7, 14, 30].map(d => (
                    <button key={d} type="button" onClick={() => setBanDays(d)}
                      className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all border-2 ${banDays === d ? 'border-red-500 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400' : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'}`}>
                      {d}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={banDays}
                  onChange={e => setBanDays(Math.max(1, Math.min(365, parseInt(e.target.value) || 1)))}
                  className="w-full rounded-2xl border-2 border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-4 py-3.5 text-sm font-bold text-gray-900 dark:text-white focus:border-red-500 focus:ring-0 transition-all outline-none"
                  placeholder="Custom days..."
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700">
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">Send Email Notification</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Notify the user about this ban with full details.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={banSendEmail}
                    onChange={e => setBanSendEmail(e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 dark:peer-focus:ring-red-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600 dark:peer-checked:bg-red-500"></div>
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  onClick={() => setBanModalOpen(false)}
                  className="flex-1 px-6 py-3.5 rounded-2xl text-sm font-bold text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={executeBan}
                  className="flex-1 px-6 py-3.5 rounded-2xl text-sm font-black uppercase tracking-widest text-white bg-red-600 dark:bg-red-500 hover:bg-red-700 dark:hover:bg-red-400 shadow-lg shadow-red-100 dark:shadow-none disabled:opacity-50 transition-all active:scale-95"
                >
                  Ban for {banDays} Day{banDays > 1 ? 's' : ''}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
