import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 bg-gray-50 dark:bg-gray-900 transition-colors">
      <div className="text-center max-w-lg animate-in fade-in zoom-in duration-500">
        {/* Large 404 */}
        <div className="relative mb-8">
          <h1 className="text-[160px] sm:text-[200px] font-black text-gray-100 dark:text-gray-800 leading-none select-none transition-colors">
            404
          </h1>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center shadow-lg animate-bounce">
              <svg className="w-10 h-10 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <h2 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white mb-3 tracking-tight transition-colors">
          Page Not Found
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mb-8 text-sm sm:text-base leading-relaxed transition-colors">
          The page you're looking for doesn't exist or has been moved. Let's get you back on track.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-sm font-bold shadow-lg shadow-indigo-200 dark:shadow-none transition-all active:scale-95"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
            Go Home
          </Link>
          <Link
            href="/explore"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-2xl text-sm font-bold border border-gray-200 dark:border-gray-700 transition-all active:scale-95"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            Explore Marketplace
          </Link>
        </div>
      </div>
    </div>
  );
}
