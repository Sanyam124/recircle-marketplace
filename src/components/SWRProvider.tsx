'use client';

import { SWRConfig } from 'swr';
import React from 'react';

export const SWRProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <SWRConfig 
      value={{ 
        fetcher: (url: string) => fetch(url).then(res => {
          if (!res.ok) {
            const error = new Error('An error occurred');
            (error as any).status = res.status;
            throw error;
          }
          return res.json();
        }),
        shouldRetryOnError: (err: any) => err.status !== 429,
        revalidateOnFocus: false,
        dedupingInterval: 2000
      }}
    >
      {children}
    </SWRConfig>
  );
};
