export default function Loading() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-6 h-8 w-48 animate-pulse rounded bg-gray-200" />
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-2xl bg-gray-100" />
        ))}
      </div>
    </main>
  );
}
