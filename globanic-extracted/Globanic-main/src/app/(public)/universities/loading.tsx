export default function UniversitiesLoading() {
  return (
    <div className="container-page py-10">
      <div className="mb-6 h-7 w-32 animate-pulse rounded bg-slate-100" />
      <div className="divide-y divide-slate-100 border-t border-slate-100">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-4">
            <div className="h-11 w-11 animate-pulse rounded bg-slate-100" />
            <div className="space-y-2">
              <div className="h-4 w-40 animate-pulse rounded bg-slate-100" />
              <div className="h-3 w-24 animate-pulse rounded bg-slate-100" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
