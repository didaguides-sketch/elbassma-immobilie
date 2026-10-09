export default function PublisherLoading() {
  return (
    <div className="container-page py-10">
      <div className="mb-6 h-4 w-32 animate-pulse rounded bg-slate-100" />
      <div className="mb-8 flex items-center gap-4">
        <div className="h-16 w-16 animate-pulse rounded-full bg-slate-100" />
        <div className="space-y-2">
          <div className="h-6 w-40 animate-pulse rounded bg-slate-100" />
          <div className="h-4 w-24 animate-pulse rounded bg-slate-100" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded border border-slate-100 bg-slate-50" />
        ))}
      </div>
    </div>
  );
}
