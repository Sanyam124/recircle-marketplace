'use client';

import { PageSkeleton, HomeSkeleton } from '@/components/Skeletons';
import { usePathname } from 'next/navigation';

export default function Loading() {
  const pathname = usePathname();
  
  if (pathname === '/') {
    return <HomeSkeleton />;
  }
  
  return <PageSkeleton />;
}
