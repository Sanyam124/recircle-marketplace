import { PostSkeleton, ProfileSkeleton } from '@/components/Skeletons';

export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 transition-colors">
      <div className="space-y-8">
        <ProfileSkeleton />
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => <PostSkeleton key={i} />)}
        </div>
      </div>
    </div>
  );
}
