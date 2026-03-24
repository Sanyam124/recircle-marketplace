import { OrderRowSkeleton } from '@/components/Skeletons';

export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 transition-colors">
      <div className="mb-8 space-y-4">
        <div className="h-10 w-48 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse" />
        <div className="h-4 w-96 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse" />
      </div>
      <div className="space-y-6">
        {[...Array(5)].map((_, i) => <OrderRowSkeleton key={i} />)}
      </div>
    </div>
  );
}
