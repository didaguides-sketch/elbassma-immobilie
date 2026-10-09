export default function Loading() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-6 h-8 w-40 animate-pulse rounded bg-gray-200" />
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 animate-pulse rounded-xl bg-gray-100" />
        ))}
      </div>
    </main>
  );
}
