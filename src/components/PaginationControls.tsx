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
          style={{ 
            opacity: 1, 
            visibility: 'visible', 
            display: 'block', 
            zIndex: 999, 
            minHeight: '44px',
            backgroundColor: '#4F46E5',
            color: 'white',
            padding: '8px 16px',
            borderRadius: '8px',
            fontWeight: 'bold'
          }}
          className="transition-all relative disabled:opacity-40"
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
                style={{ 
                  opacity: 1, 
                  visibility: 'visible', 
                  display: 'block', 
                  zIndex: 999, 
                  minHeight: '44px',
                  backgroundColor: p === page ? '#4F46E5' : 'white',
                  color: p === page ? 'white' : '#4F46E5',
                  border: '2px solid #4F46E5',
                  borderRadius: '8px',
                  fontWeight: 'bold'
                }}
                className={`w-9 h-9 transition-all relative`}
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
          style={{ 
            opacity: 1, 
            visibility: 'visible', 
            display: 'block', 
            zIndex: 999, 
            minHeight: '44px',
            backgroundColor: '#4F46E5',
            color: 'white',
            padding: '8px 16px',
            borderRadius: '8px',
            fontWeight: 'bold'
          }}
          className="transition-all relative disabled:opacity-40"
        >
          Next
        </button>
      </div>
    );
  }
