export default function SearchLoading() {
  return (
    <div className="container-page py-10">
      <div className="mb-6 h-6 w-48 animate-pulse rounded bg-slate-100" />
      <div className="mx-auto mb-8 max-w-xl">
        <div className="h-11 w-full animate-pulse rounded bg-slate-100" />
      </div>
      <div className="mb-8 h-10 w-full animate-pulse rounded bg-slate-100" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded border border-slate-100 bg-slate-50" />
        ))}
      </div>
    </div>
  );
}
