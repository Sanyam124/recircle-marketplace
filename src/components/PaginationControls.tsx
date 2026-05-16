export default function PaginationControls({ page, totalPages, onPageChange, scrollTargetId }: {
    page: number; totalPages: number; onPageChange: (p: number) => void; scrollTargetId?: string;
  }) {
    if (totalPages <= 1) return null;
  
    const pages = Array.from({ length: totalPages }, (_, i) => i + 1)
      .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2);
  
    return (
      <div className="mt-8 flex justify-center items-center gap-2 pb-10">
        <button
          onClick={() => {
            if (scrollTargetId) document.getElementById(scrollTargetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            onPageChange(Math.max(1, page - 1));
          }}
          disabled={page === 1}
          className="relative z-10 opacity-100 visible px-4 py-2 text-sm font-medium rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors appearance-none touch-manipulation cursor-pointer"
        >
          Previous
        </button>
  
        <div className="flex gap-1">
          {pages.map((p, i) => (
            <div key={p} className="flex items-center">
              {i > 0 && pages[i - 1] !== p - 1 && <span className="px-2 text-gray-400 dark:text-gray-500">...</span>}
              <button
                onClick={() => {
                  if (scrollTargetId) document.getElementById(scrollTargetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  onPageChange(p);
                }}
                className={`relative z-10 opacity-100 visible w-9 h-9 text-sm font-bold rounded-lg transition-colors appearance-none touch-manipulation cursor-pointer ${p === page ? 'bg-indigo-600 text-white' : 'border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
              >
                {p}
              </button>
            </div>
          ))}
        </div>
  
        <button
          onClick={() => {
            if (scrollTargetId) document.getElementById(scrollTargetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            onPageChange(Math.min(totalPages, page + 1));
          }}
          disabled={page === totalPages}
          className="relative z-10 opacity-100 visible px-4 py-2 text-sm font-medium rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors appearance-none touch-manipulation cursor-pointer"
        >
          Next
        </button>
      </div>
    );
  }
