import { ItemCardSkeleton } from '@/components/Skeletons';

export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 transition-colors">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => <ItemCardSkeleton key={i} />)}
      </div>
    </div>
  );
}
