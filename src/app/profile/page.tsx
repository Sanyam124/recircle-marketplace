'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Loader from '@/components/Loader';

export default function ProfileRedirectPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user?.id) {
        router.replace(`/profile/${user.id}`);
      } else {
        router.replace('/auth');
      }
    }
  }, [user, loading, router]);

  return <Loader />;
}
