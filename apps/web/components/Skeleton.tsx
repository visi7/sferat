// Forma "skelet" (gri, pulsojnë ngadalë) për gjendjen e ngarkimit — zëvendësojnë
// tekstin e thjeshtë "Loading…", duke e bërë pritjen të duket më e shpejtë dhe
// duke sugjeruar paraprakisht formën e përmbajtjes që po vjen.

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />;
}

export function PostCardSkeleton() {
  return (
    <div className="bg-white border rounded-xl p-4 space-y-3" aria-hidden="true">
      <div className="flex items-center gap-2">
        <Skeleton className="w-8 h-8 rounded-full" />
        <Skeleton className="h-3 w-28" />
      </div>
      <Skeleton className="h-4 w-3/4" />
      <div className="space-y-1.5">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
      </div>
      <div className="flex gap-2 pt-1">
        <Skeleton className="h-8 w-20 rounded-full" />
        <Skeleton className="h-8 w-20 rounded-full" />
        <Skeleton className="h-8 w-28 rounded-full" />
      </div>
    </div>
  );
}

export function FeedSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <PostCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function ListRowSkeleton() {
  return (
    <div className="flex items-center gap-2 py-1" aria-hidden="true">
      <Skeleton className="w-6 h-6 rounded-full shrink-0" />
      <Skeleton className="h-3 flex-1" />
    </div>
  );
}

export function ListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <ListRowSkeleton key={i} />
      ))}
    </div>
  );
}

export function LineSkeleton({ className = "w-full" }: { className?: string }) {
  return <Skeleton className={`h-3 ${className}`} />;
}
