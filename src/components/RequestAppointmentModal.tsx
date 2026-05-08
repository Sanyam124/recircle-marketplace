'use client';

import { useState } from 'react';
import Link from 'next/link';

interface RequestAppointmentModalProps {
  serviceId: string;
  itemTitle: string;
  originalPrice: number;
  onClose: () => void;
}

export default function RequestAppointmentModal({
  serviceId, itemTitle, originalPrice, onClose
}: RequestAppointmentModalProps) {
  const [offeredPrice, setOfferedPrice] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState('');

  const handleSubmit = async () => {
    const price = Number(offeredPrice);
    if (!price || price <= 0) { setError('Please enter a valid budget/price.'); return; }
    // Decimal check is now handled in onChange, but keeping a fallback here is safe
    if (offeredPrice.includes('.') && offeredPrice.split('.')[1].length > 2) { setError('Only 2 decimal places allowed.'); return; }

    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceId, offeredPrice: price, message: message.trim() || undefined }),
      });
      const data = await res.json();
      if (res.ok) { onClose(); }
      else { setError(data.error || 'Failed to submit request.'); }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 transition-colors" onClick={onClose}>
      <div className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl p-6 transition-colors" onClick={e => e.stopPropagation()}>
          <>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Request Appointment</h3>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1 truncate">For: <span className="font-semibold text-gray-700 dark:text-gray-300">{itemTitle}</span></p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Listed at: <span className="font-bold text-gray-900 dark:text-white">₹{originalPrice.toLocaleString()}</span></p>

            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Your Proposed Budget (₹)</label>
            <input
              type="number"
              value={offeredPrice}
              step="1"
              onChange={e => { 
                const val = e.target.value;
                if (!/^\d*$/.test(val)) return;
                setOfferedPrice(val); 
                setError(''); 
              }}
              placeholder={`e.g. ₹${originalPrice}`}
              className="w-full border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-zinc-800 dark:text-white mb-4 transition-colors"
            />

            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Message to Provider <span className="text-gray-400 dark:text-gray-500 font-normal">(optional)</span></label>
            <textarea
              className="w-full border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400 mb-4 dark:bg-zinc-800 dark:text-white transition-colors"
              rows={3}
              placeholder="Preferred dates, questions about the service..."
              value={message}
              onChange={e => setMessage(e.target.value)}
            />

            {offeredPrice && Number(offeredPrice) > originalPrice * 2 && (
              <p className="text-sm text-red-500 font-bold mb-3 animate-pulse">Max limit: 200% of listed price (₹{originalPrice * 2})</p>
            )}

            {error && <p className="text-sm text-red-500 dark:text-red-400 mb-3">{error}</p>}

            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors">
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={
                  submitting || 
                  !offeredPrice || 
                  Number(offeredPrice) <= 0 || 
                  Number(offeredPrice) > originalPrice * 2
                }
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
              >
                {submitting ? 'Sending…' : 'Send Request'}
              </button>
            </div>
          </>
      </div>
    </div>
  );
}
