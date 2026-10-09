export default function AuthorsLoading() {
  return (
    <div className="container-page py-10">
      <div className="mb-6 h-7 w-32 animate-pulse rounded bg-slate-100" />
      <div className="grid grid-cols-1 divide-y divide-slate-100 border-t border-slate-100 sm:grid-cols-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between py-3">
            <div className="space-y-2">
              <div className="h-4 w-32 animate-pulse rounded bg-slate-100" />
              <div className="h-3 w-24 animate-pulse rounded bg-slate-100" />
            </div>
            <div className="h-3 w-12 animate-pulse rounded bg-slate-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
