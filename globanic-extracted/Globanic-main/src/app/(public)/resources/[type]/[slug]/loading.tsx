export default function ResourceLoading() {
  return (
    <div className="container-page py-10">
      <div className="mb-6 h-4 w-64 animate-pulse rounded bg-slate-100" />
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="h-5 w-20 animate-pulse rounded bg-slate-100" />
          <div className="h-8 w-3/4 animate-pulse rounded bg-slate-100" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-slate-100" />
          <div className="h-56 w-full animate-pulse rounded bg-slate-100" />
          <div className="h-10 w-40 animate-pulse rounded bg-slate-100" />
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded border border-slate-100 bg-slate-50" />
            ))}
          </div>
          <div className="h-32 animate-pulse rounded bg-slate-100" />
        </div>
      </div>
    </div>
  );
}
