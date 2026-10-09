export default function Loading() {
  return (
    <main className="container-page py-10">
      <div className="mb-6 h-8 w-56 animate-pulse rounded bg-slate-200" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-32 animate-pulse rounded bg-slate-100" />
        ))}
      </div>
    </main>
  );
}
