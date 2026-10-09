import { auth } from "@/server/auth/auth";
import { getOwnEarnings } from "@/server/services/payout.service";
import { StatCard } from "@/components/analytics/StatCard";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import type { Dictionary } from "@/lib/i18n/get-dictionary";
import { formatDate } from "@/lib/i18n/format";

// NOTE (Batch 6): the amount/count formatting below (formatAmount,
// toLocaleString("ar-DZ")) is unchanged from before this batch — it is
// the same category of hardcoded-locale issue as the
// Intl.DateTimeFormat("fr-FR") calls this batch replaces, but rule 6
// named only the date-formatting calls explicitly, so this is left as
// a disclosed, deliberate exception; see the Batch 6 freeze report.
function formatAmount(cents: number, currency: string) {
  return `${(cents / 100).toLocaleString("ar-DZ", { minimumFractionDigits: 2 })} ${currency}`;
}

function periodStatusLabel(status: string, dict: Dictionary): string {
  if (status === "DRAFT") return dict.publisherDashboard.periodStatusDraft;
  if (status === "FINALIZED") return dict.publisherDashboard.periodStatusFinalized;
  return status;
}

function periodStatusStyle(status: string): string {
  if (status === "DRAFT") return "bg-amber-50 text-amber-800";
  if (status === "FINALIZED") return "bg-slate-100 text-slate-700";
  return "bg-slate-100 text-slate-700";
}

function payoutStatusLabel(status: string, dict: Dictionary): string {
  switch (status) {
    case "PENDING":
      return dict.publisherDashboard.payoutStatusPending;
    case "APPROVED":
      return dict.publisherDashboard.payoutStatusApproved;
    case "PAID":
      return dict.publisherDashboard.payoutStatusPaid;
    case "FAILED":
      return dict.publisherDashboard.payoutStatusFailed;
    default:
      return status;
  }
}

function payoutStatusStyle(status: string): string {
  switch (status) {
    case "PENDING":
      return "bg-slate-100 text-slate-700";
    case "APPROVED":
      return "bg-blue-50 text-blue-700";
    case "PAID":
      return "bg-green-50 text-green-700";
    case "FAILED":
      return "bg-red-50 text-red-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

export default async function EarningsPage() {
  const locale = await getLocale();
  const dict = await getDictionary(locale);
  const session = await auth();
  const actor = { id: session!.user.id, role: session!.user.role };
  const earnings = await getOwnEarnings(actor);

  return (
    <main className="container-page py-10">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-6 font-serif text-h1 font-semibold text-globanic-navy">{dict.publisherDashboard.earningsHeading}</h1>

        <div className="mb-6 grid grid-cols-2 gap-4">
          <StatCard
            label={dict.publisherDashboard.totalPaidLabel}
            value={formatAmount(earnings.totalPaidCents, earnings.currency)}
          />
          <StatCard
            label={dict.publisherDashboard.pendingApprovedLabel}
            value={formatAmount(earnings.totalPendingCents, earnings.currency)}
            hint={dict.publisherDashboard.notYetDisbursedHint}
          />
        </div>

        <div className="mb-6 rounded border border-slate-200 bg-slate-50 p-4 text-body-sm text-slate-600">
          {dict.publisherDashboard.financeNotePrefix}{" "}
          <span className="font-semibold text-slate-800">{dict.publisherDashboard.periodStatusDraft}</span>{" "}
          {dict.publisherDashboard.financeNoteSuffix}
        </div>

        {earnings.payouts.length === 0 ? (
          <div className="rounded border border-dashed border-slate-200 bg-white p-12 text-center">
            <p className="text-body-sm text-slate-500">
              {dict.publisherDashboard.noPayoutsYetMessage}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {earnings.payouts.map((p) => (
              <div key={p.id} className="rounded border border-slate-200 bg-white p-4">
                <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-globanic-navy">{p.periodLabel}</p>
                    <p className="text-caption text-slate-400">
                      {formatDate(p.periodStart, locale, { day: "2-digit", month: "2-digit", year: "numeric" })}
                      {" — "}
                      {formatDate(p.periodEnd, locale, { day: "2-digit", month: "2-digit", year: "numeric" })}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-1 text-caption font-semibold ${periodStatusStyle(p.periodStatus)}`}
                    >
                      {periodStatusLabel(p.periodStatus, dict)}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-caption font-semibold ${payoutStatusStyle(p.status)}`}
                    >
                      {payoutStatusLabel(p.status, dict)}
                    </span>
                  </div>
                </div>

                <dl className="grid grid-cols-2 gap-3 text-body-sm sm:grid-cols-4">
                  <div>
                    <dt className="text-slate-500">{dict.publisherDashboard.amountLabel}</dt>
                    <dd className="font-medium text-globanic-navy">
                      {formatAmount(p.amountCents, p.currency)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">{dict.publisherDashboard.eligibleViewsLabel}</dt>
                    <dd className="font-medium text-slate-700">
                      {p.eligibleViews.toLocaleString("ar-DZ")}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">{dict.publisherDashboard.transactionRefLabel}</dt>
                    <dd className="font-medium text-slate-700">{p.transactionReference ?? dict.publisherDashboard.emptyValuePlaceholder}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">{dict.publisherDashboard.paidAtLabel}</dt>
                    <dd className="font-medium text-slate-700">
                      {p.paidAt ? formatDate(p.paidAt, locale) : dict.publisherDashboard.emptyValuePlaceholder}
                    </dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
