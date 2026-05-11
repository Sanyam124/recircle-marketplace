'use client';

import ChatSidebar from '@/components/ChatSidebar';
import { usePathname } from 'next/navigation';

export default function ChatLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isIndex = pathname === '/chat';

    return (
        <div className="max-w-7xl mx-auto sm:px-6 lg:px-8 sm:py-8 h-[calc(100dvh-64px)] max-md:h-[calc(100dvh-64px-68px-env(safe-area-inset-bottom,0px)-8px)] w-full bg-gray-50 dark:bg-gray-900 sm:bg-transparent transition-colors z-[40] max-md:fixed max-md:top-[64px] max-md:left-0 max-md:right-0">
            <div className="bg-white dark:bg-gray-900 sm:shadow-xl sm:rounded-2xl overflow-hidden sm:border border-gray-200 dark:border-gray-700 h-full flex transition-colors">
                <div className={`${isIndex ? 'w-full md:w-80 lg:w-96' : 'hidden md:block w-80 lg:w-96'} flex-shrink-0 border-r border-gray-200 dark:border-gray-700`}>
                    <ChatSidebar />
                </div>
                <div className={`${isIndex ? 'hidden md:flex flex-1 items-center justify-center bg-gray-50 dark:bg-gray-800 transition-colors relative overflow-hidden' : 'flex-1 flex flex-col min-w-0 bg-white dark:bg-gray-900 transition-colors relative'}`}>
                    {children}
                </div>
            </div>
        </div>
    );
}
