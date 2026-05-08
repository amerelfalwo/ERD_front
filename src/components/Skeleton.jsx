export function Skeleton({ className = '', ...props }) {
  return (
    <div className={`animate-shimmer rounded-lg ${className}`} {...props} />
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/60 p-6 space-y-4 shadow-whisper">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-28 rounded" />
        <Skeleton className="w-9 h-9 rounded-lg" />
      </div>
      <Skeleton className="h-8 w-2/5 rounded" />
      <Skeleton className="h-3 w-24 rounded" />
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }) {
  return (
    <div className="space-y-0">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="grid gap-2 items-center py-4 px-6 border-b border-outline-variant/30"
          style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
        >
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton key={j} className={`h-4 rounded ${j === 0 ? 'w-12' : j === 1 ? 'w-32' : 'w-16 ml-auto'}`} />
          ))}
        </div>
      ))}
    </div>
  );
}
