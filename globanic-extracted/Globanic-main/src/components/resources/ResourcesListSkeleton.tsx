export function ResourcesListSkeleton() {
  return (
    <div className="container-page py-10">
      <div className="mb-6 h-7 w-40 animate-pulse rounded bg-slate-100" />
      <div className="mb-8 flex gap-2 border-b border-slate-100 pb-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-8 w-20 animate-pulse rounded bg-slate-100" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded border border-slate-100 bg-slate-50" />
        ))}
      </div>
    </div>
  );
}
