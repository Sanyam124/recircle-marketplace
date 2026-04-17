'use client';

import { SWRConfig } from 'swr';
import React from 'react';

export const SWRProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <SWRConfig 
      value={{ 
        fetcher: async (url: string) => {
          const res = await fetch(url, { cache: 'no-store' });
          if (res.status === 429) {
            const data = await res.json().catch(() => ({}));
            const retryAfter = data.retryAfter || 30;
            window.dispatchEvent(new CustomEvent('app-rate-limit', { detail: { retryAfter } }));
            
            const error = new Error('Too many requests');
            (error as any).status = 429;
            throw error;
          }
          if (!res.ok) {
            const error = new Error('An error occurred');
            (error as any).status = res.status;
            throw error;
          }
          return res.json();
        },
        shouldRetryOnError: (err: any) => err.status !== 429,
        revalidateOnFocus: false,
        dedupingInterval: 2000
      }}
    >
      {children}
    </SWRConfig>
  );
};
