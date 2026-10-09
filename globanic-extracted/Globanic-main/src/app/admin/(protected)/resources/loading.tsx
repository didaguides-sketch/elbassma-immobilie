export default function Loading() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6 h-8 w-48 animate-pulse rounded bg-slate-200" />
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded bg-slate-100" />
        ))}
      </div>
    </main>
  );
}
