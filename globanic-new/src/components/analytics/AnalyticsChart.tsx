"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import type { SeriesPoint } from "@/server/services/analytics-query.service";

export function AnalyticsChart({ data }: { data: SeriesPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-gray-300 text-sm text-gray-400">
        لا توجد بيانات كافية بعد لعرض الرسم البياني.
      </div>
    );
  }

  const formatted = data.map((point) => ({
    ...point,
    label: new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit" }).format(
      new Date(point.date),
    ),
  }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={formatted} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
          <XAxis dataKey="label" fontSize={12} />
          <YAxis allowDecimals={false} fontSize={12} />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="views" name="مشاهدات" stroke="#1E5FD9" strokeWidth={2} />
          <Line type="monotone" dataKey="downloads" name="تحميلات" stroke="#3B7DFF" strokeWidth={2} strokeDasharray="4 2" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
