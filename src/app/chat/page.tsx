'use client';

export default function ChatPage() {
    return (
        <>
            {/* Background Pattern for Empty State */}
            <div className="absolute inset-0 opacity-5 dark:opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
            
            <div className="text-center animate-in fade-in zoom-in duration-300 relative z-10 p-8 w-full max-w-lg mx-auto">
                <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 mb-6 shadow-sm ring-4 ring-white dark:ring-gray-800">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight">Your Messages</h2>
                <p className="text-gray-500 dark:text-gray-400 leading-relaxed">Select a conversation from the sidebar to view messages, or start a new chat directly from a listing.</p>
            </div>
        </>
    );
}
