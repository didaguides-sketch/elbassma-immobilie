export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: number | string;
  hint?: string;
}) {
  return (
    <div className="rounded border border-slate-200 bg-white p-4">
      <p className="text-body-sm font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-h3 font-semibold text-globanic-navy">{value}</p>
      {hint && <p className="mt-1 text-caption text-slate-400">{hint}</p>}
    </div>
  );
}
