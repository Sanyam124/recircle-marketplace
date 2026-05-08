'use client';

import { useState } from 'react';
import useSWR from 'swr';

const REASONS = [
  'Spam or misleading',
  'Fake or counterfeit item',
  'Inappropriate content',
  'Prohibited item',
  'Wrong category',
  'Other',
];

interface ReportModalProps {
  targetUserId: string;
  /** null means the report is about the user directly, not a specific listing */
  itemType: 'product' | 'service' | null;
  itemId?: string | null;
  onClose: () => void;
}

export default function ReportModal({ targetUserId, itemType, itemId, onClose }: ReportModalProps) {
  const [reason, setReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const { data: siteConfig } = useSWR('/api/site-config');
  const maxChars = siteConfig?.maxReportOtherChars || 500;

  const handleSubmit = async () => {
    const finalReason = reason === 'Other' ? customReason.trim() : reason;
    if (!finalReason) { setError('Please select or enter a reason.'); return; }

    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          targetUserId, 
          itemType: itemType || 'none', 
          itemId: itemId || null, 
          reason: finalReason 
        }),
      });
      const data = await res.json();
      if (res.ok) { setDone(true); }
      else { setError(data.error || 'Failed to submit report.'); }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 transition-colors" onClick={onClose}>
      <div
        className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl p-6 transition-colors"
        onClick={e => e.stopPropagation()}
      >
        {done ? (
          <div className="text-center py-6">
            <div className="w-14 h-14 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Report Submitted</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">Our team will review it shortly. Thank you for helping keep ReCircle safe.</p>
            <button onClick={onClose} className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700 transition-colors">
              Close
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Report User</h3>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Why are you reporting this? We take all reports seriously.</p>

            <div className="space-y-2 mb-4">
              {REASONS.map(r => (
                <label key={r} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${reason === r ? 'border-indigo-500 bg-indigo-50 dark:border-indigo-500 dark:bg-indigo-900/30' : 'border-gray-200 dark:border-zinc-700 dark:bg-zinc-800 hover:border-gray-300 dark:hover:border-zinc-600'}`}>
                  <input type="radio" name="reason" value={r} checked={reason === r} onChange={() => { setReason(r); setError(''); }} className="accent-indigo-600" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{r}</span>
                </label>
              ))}
            </div>

            {reason === 'Other' && (
              <div className="mb-4">
                <textarea
                  className="w-full border border-gray-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-zinc-800 dark:text-white transition-all"
                  rows={4}
                  maxLength={maxChars}
                  placeholder={`Describe the issue in detail (max ${maxChars} characters)...`}
                  value={customReason}
                  onChange={e => {
                    if (e.target.value.length <= maxChars) {
                      setCustomReason(e.target.value);
                    }
                  }}
                />
                <div className="flex justify-end mt-1">
                  <span className={`text-[10px] font-bold ${customReason.length >= (maxChars - 50) ? 'text-red-500' : 'text-gray-400'}`}>
                    {customReason.length} / {maxChars}
                  </span>
                </div>
              </div>
            )}

            {error && <p className="text-sm text-red-500 dark:text-red-400 mb-3">{error}</p>}

            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors">
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
              >
                {submitting ? 'Submitting…' : 'Submit Report'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
