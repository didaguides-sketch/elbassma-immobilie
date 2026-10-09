import { auth } from "@/server/auth/auth";
import { can } from "@/server/auth/rbac";
import { listRevenuePeriods } from "@/server/services/revenue-period.service";
import {
  CreateRevenuePeriodForm,
  FinalizePeriodButton,
  PERIOD_STATUS_LABEL_KEY,
  PERIOD_STATUS_STYLE,
} from "@/components/admin/RevenuePeriodPanel";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { formatDate } from "@/lib/i18n/format";

// NOTE (Batch 7C): this formatAmount currency helper is unchanged from
// before this batch — same disclosed, deliberate exception as Batch 6's
// earnings page (rule 8: do not broaden scope to replace
// toLocaleString("ar-DZ") currency formatting).
function formatAmount(cents: number, currency: string) {
  return `${(cents / 100).toLocaleString("ar-DZ", { minimumFractionDigits: 2 })} ${currency}`;
}

export default async function AdminRevenuePeriodsPage() {
  const locale = await getLocale();
  const dict = await getDictionary(locale);
  const session = await auth();
  const actor = { id: session!.user.id, role: session!.user.role };
  const periods = await listRevenuePeriods(actor);
  const canFinalize = can(actor.role, "revenue-period:finalize");

  return (
    <main className="container-page py-10">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-6 font-serif text-h1 font-semibold text-globanic-navy">{dict.adminDashboard.revenuePeriodsPageTitle}</h1>

        <div className="mb-8 rounded border border-slate-200 bg-white p-5">
          <h2 className="mb-4 text-body-sm font-semibold text-slate-700">{dict.adminDashboard.newRevenuePeriodHeading}</h2>
          <CreateRevenuePeriodForm />
        </div>

        <div className="space-y-4">
          {periods.map((period) => (
            <div key={period.id} className="rounded border border-slate-200 bg-white p-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-globanic-navy">{period.label}</p>
                  <p className="text-caption text-slate-500">
                    {formatDate(period.periodStart, locale)} —{" "}
                    {formatDate(period.periodEnd, locale)}
                  </p>
                </div>
                <span className={`rounded-full px-3 py-1 text-caption font-semibold ${PERIOD_STATUS_STYLE[period.status]}`}>
                  {dict.adminDashboard[PERIOD_STATUS_LABEL_KEY[period.status] as keyof typeof dict.adminDashboard]}
                </span>
              </div>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-body-sm">
                <span className="text-slate-500">{dict.adminDashboard.totalRevenueDisplayLabel} {formatAmount(period.totalRevenueCents, period.currency)}</span>
                <span className="text-slate-500">{dict.adminDashboard.payoutsCountLabel} {period._count.payouts}</span>
              </div>
              {period.status === "DRAFT" && (
                <FinalizePeriodButton revenuePeriodId={period.id} canFinalize={canFinalize} />
              )}
            </div>
          ))}
          {periods.length === 0 && (
            <p className="rounded border border-dashed border-slate-200 bg-white p-8 text-center text-slate-400">
              {dict.adminDashboard.noRevenuePeriodsMessage}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
