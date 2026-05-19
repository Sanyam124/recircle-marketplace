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
    <div className="fixed inset-0 z-[500] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4 transition-all" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-t-[2.5rem] sm:rounded-[3rem] shadow-2xl p-6 sm:p-10 transition-all animate-in slide-in-from-bottom sm:zoom-in duration-300 max-h-[92vh] overflow-y-auto pb-[120px] sm:pb-10"
        onClick={e => e.stopPropagation()}
      >
        {/* Mobile Drag Handle */}
        <div className="flex sm:hidden justify-center mb-8 -mt-2">
            <div className="w-14 h-1.5 bg-gray-200 dark:bg-zinc-800 rounded-full"></div>
        </div>

        <div className="flex items-start justify-between mb-8 sm:mb-10">
          <div>
            <h3 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tighter italic uppercase leading-tight">What would you like <br className="sm:hidden" /> to do?</h3>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-2 font-medium">Select an option to start earning on ReCircle</p>
          </div>
          <button onClick={onClose} className="p-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors bg-gray-100 dark:bg-zinc-800 rounded-2xl shrink-0 ml-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col sm:grid sm:grid-cols-2 gap-4 sm:gap-6">
          {/* Option 1: Product */}
          <button
            onClick={() => handleSelect('/products/create')}
            className="group flex flex-row sm:flex-col items-center sm:items-start gap-4 sm:gap-0 p-4 sm:p-7 bg-indigo-50/50 dark:bg-indigo-500/5 border-2 border-indigo-100 dark:border-indigo-900/30 rounded-[2rem] hover:border-indigo-600 dark:hover:border-indigo-500 transition-all hover:shadow-xl hover:-translate-y-1 text-left w-full"
          >
            <div className="h-12 w-12 sm:h-16 sm:w-16 shrink-0 rounded-2xl bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center sm:mb-6 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
              <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <div className="min-w-0">
              <h4 className="text-sm sm:text-xl font-black text-gray-900 dark:text-white mb-0.5 sm:mb-1 uppercase italic tracking-tighter group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Sell a Product</h4>
              <p className="text-[10px] sm:text-sm text-gray-500 dark:text-gray-400 leading-tight sm:leading-relaxed font-medium">List gadgets, books, or essentials.</p>
            </div>
          </button>

          {/* Option 2: Service */}
          <button
            onClick={() => handleSelect('/services/create')}
            className="group flex flex-row sm:flex-col items-center sm:items-start gap-4 sm:gap-0 p-4 sm:p-7 bg-purple-50/50 dark:bg-purple-500/5 border-2 border-purple-100 dark:border-purple-900/30 rounded-[2rem] hover:border-indigo-600 dark:hover:border-indigo-500 transition-all hover:shadow-xl hover:-translate-y-1 text-left w-full"
          >
            <div className="h-12 w-12 sm:h-16 sm:w-16 shrink-0 rounded-2xl bg-white dark:bg-zinc-800 text-purple-600 dark:text-purple-400 flex items-center justify-center sm:mb-6 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
              <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="min-w-0">
              <h4 className="text-sm sm:text-xl font-black text-gray-900 dark:text-white mb-0.5 sm:mb-1 uppercase italic tracking-tighter group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Offer a Service</h4>
              <p className="text-[10px] sm:text-sm text-gray-500 dark:text-gray-400 leading-tight sm:leading-relaxed font-medium">Provide tutoring or design skills.</p>
            </div>
          </button>
        </div>

        <p className="mt-8 sm:mt-10 text-center text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
          Everything you earn is yours. ReCircle takes <span className="text-indigo-600 dark:text-indigo-400 font-black">zero platform fees</span>.
        </p>
      </div>
    </div>
  );
}
