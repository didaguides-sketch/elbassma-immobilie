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
import { useLocale, useTranslations } from "@/components/i18n/I18nProvider";
import { formatDate } from "@/lib/i18n/format";

export function AnalyticsChart({ data }: { data: SeriesPoint[] }) {
  const locale = useLocale();
  const t = useTranslations("publisherDashboard");

  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded border border-dashed border-slate-200 text-body-sm text-slate-400">
        {t("chartEmptyMessage")}
      </div>
    );
  }

  const formatted = data.map((point) => ({
    ...point,
    label: formatDate(new Date(point.date), locale, { day: "2-digit", month: "2-digit" }),
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
          <Line type="monotone" dataKey="views" name={t("chartViewsLegend")} stroke="#1E5FD9" strokeWidth={2} />
          <Line type="monotone" dataKey="downloads" name={t("chartDownloadsLegend")} stroke="#3B7DFF" strokeWidth={2} strokeDasharray="4 2" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
