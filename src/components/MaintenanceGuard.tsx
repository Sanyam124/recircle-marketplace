'use client';

import { useAuth } from '@/context/AuthContext';
import useSWR from 'swr';

export default function MaintenanceGuard({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const { data } = useSWR('/api/site-config', { refreshInterval: 60000 });

    const isAdmin = user?.role === 'admin';
    const isMaintenanceMode = data?.maintenanceMode === true;

    if (isMaintenanceMode && !isAdmin) {
        return (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-950 to-black p-6">
                <div className="max-w-lg w-full text-center">
                    <div className="w-24 h-24 mx-auto mb-8 bg-indigo-500/10 rounded-full flex items-center justify-center animate-pulse">
                        <svg className="w-12 h-12 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </div>
                    <h1 className="text-4xl font-black text-white tracking-tight mb-4">Under Maintenance</h1>
                    <p className="text-lg text-gray-400 font-medium mb-8 leading-relaxed">
                        ReCircle is currently undergoing scheduled maintenance. We&apos;ll be back shortly with improvements!
                    </p>
                    <div className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-sm font-bold text-gray-300">
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                        Estimated downtime: A few minutes
                    </div>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
