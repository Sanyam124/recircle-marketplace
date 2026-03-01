'use client';

import { useRouter } from 'next/navigation';

interface StartEarningModalProps {
  onClose: () => void;
}

export default function StartEarningModal({ onClose }: StartEarningModalProps) {
  const router = useRouter();

  const handleSelect = (path: string) => {
    router.push(path);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 transition-all" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-8 transition-all scale-100 animate-in fade-in zoom-in duration-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">What would you like to do?</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Select an option to start earning on ReCircle</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors bg-gray-100 dark:bg-gray-700 rounded-full">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Option 1: Product */}
          <button
            onClick={() => handleSelect('/products/create')}
            className="group flex flex-col items-start p-6 bg-white dark:bg-gray-900 border-2 border-gray-100 dark:border-gray-700 rounded-3xl hover:border-indigo-600 dark:hover:border-indigo-500 transition-all hover:shadow-xl hover:-translate-y-1 text-left"
          >
            <div className="h-14 w-14 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center mb-5 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">Sell a Product</h4>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">List used textbooks, gadgets, or essentials for campus peers.</p>
          </button>

          {/* Option 2: Service */}
          <button
            onClick={() => handleSelect('/services/create')}
            className="group flex flex-col items-start p-6 bg-white dark:bg-gray-900 border-2 border-gray-100 dark:border-gray-700 rounded-3xl hover:border-indigo-600 dark:hover:border-indigo-500 transition-all hover:shadow-xl hover:-translate-y-1 text-left"
          >
            <div className="h-14 w-14 rounded-2xl bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center mb-5 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">Offer a Service</h4>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">Provide tutoring, design, tech support, or other skills.</p>
          </button>
        </div>

        <p className="mt-8 text-center text-xs text-gray-400 dark:text-gray-500">
          Everything you earn is yours. ReCircle takes <strong>zero platform fees</strong>.
        </p>
      </div>
    </div>
  );
}
