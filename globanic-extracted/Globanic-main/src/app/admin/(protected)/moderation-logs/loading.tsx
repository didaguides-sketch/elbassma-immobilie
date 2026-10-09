export default function Loading() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6 h-8 w-64 animate-pulse rounded bg-slate-200" />
      <div className="mb-6 h-10 w-full animate-pulse rounded bg-slate-100" />
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-12 animate-pulse rounded bg-slate-100" />
        ))}
      </div>
    </main>
  );
}
