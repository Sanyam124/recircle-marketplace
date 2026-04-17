'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Loader from '@/components/Loader';

export default function EditProfilePage() {
    const router = useRouter();
    useEffect(() => {
        router.replace('/settings?tab=profile');
    }, [router]);
    
    return <Loader />;
}
