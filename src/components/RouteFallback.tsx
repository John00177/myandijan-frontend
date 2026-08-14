import Skeleton from "./ui/Skeleton";

/**
 * Suspense fallback for lazily loaded routes. Mirrors the rough shape of a page
 * (header block plus a content grid) so the swap to real content does not shift
 * layout noticeably.
 */
export default function RouteFallback() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <Skeleton className="h-9 w-56" />
      <Skeleton className="h-5 w-80 mt-4" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-10">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-[180px]" />
        ))}
      </div>
    </div>
  );
}
