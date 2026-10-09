import { auth } from "@/server/auth/auth";
import { listPayoutsForAdmin, listPublishersAwaitingPayment } from "@/server/services/payout.service";
import { PayoutRowActions } from "@/components/admin/PayoutRowActions";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import type { Dictionary } from "@/lib/i18n/get-dictionary";

const STATUS_STYLE: Record<string, string> = {
  PENDING: "bg-slate-100 text-slate-700",
  APPROVED: "bg-blue-50 text-blue-700",
  PAID: "bg-green-50 text-green-700",
  FAILED: "bg-red-50 text-red-700",
};

// NOTE (Batch 7C): unchanged from before this batch — same disclosed,
// deliberate exception as Batch 6's earnings page (rule 8).
function formatAmount(cents: number, currency: string) {
  return `${(cents / 100).toLocaleString("ar-DZ", { minimumFractionDigits: 2 })} ${currency}`;
}

function methodLabel(method: string) {
  return method === "CCP_BARIDIMOB" ? "CCP / Baridi Mob" : method;
}

function statusLabel(status: string, dict: Dictionary): string {
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

export default async function AdminPayoutsPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const dict = await getDictionary(await getLocale());
  const session = await auth();
  const actor = { id: session!.user.id, role: session!.user.role };
  // Default view (no ?status=) is the "awaiting payment" queue requested
  // explicitly — PENDING + APPROVED only, oldest first. Picking an
  // explicit status tab (including "الكل") switches to the full list.
  const payouts = searchParams.status
    ? await listPayoutsForAdmin(actor, searchParams.status === "ALL" ? undefined : { status: searchParams.status })
    : await listPublishersAwaitingPayment(actor);

  return (
    <main className="container-page py-10">
      <h1 className="mb-2 font-serif text-h1 font-semibold text-globanic-navy">{dict.adminDashboard.payoutsPageTitle}</h1>
      <p className="mb-6 text-body-sm text-slate-500">
        {dict.adminDashboard.payoutsPageIntro}
      </p>

      <div className="mb-4 flex flex-wrap gap-2">
        <a
          href="/admin/payouts"
          className={`rounded-full px-3 py-1.5 text-caption font-semibold ${
            !searchParams.status ? "bg-globanic-navy text-white" : "bg-slate-100 text-slate-600"
          }`}
        >
          {dict.adminDashboard.awaitingPaymentTabLabel}
        </a>
        {["ALL", "PENDING", "APPROVED", "PAID", "FAILED"].map((s) => (
          <a
            key={s}
            href={`/admin/payouts?status=${s}`}
            className={`rounded-full px-3 py-1.5 text-caption font-semibold ${
              searchParams.status === s ? "bg-globanic-navy text-white" : "bg-slate-100 text-slate-600"
            }`}
          >
            {s === "ALL" ? dict.adminDashboard.filterAll : statusLabel(s, dict)}
          </a>
        ))}
      </div>

      <div className="overflow-x-auto rounded border border-slate-200 bg-white">
        <table className="w-full text-body-sm">
          <thead className="bg-slate-50 text-start text-caption font-semibold text-slate-500">
            <tr>
              <th className="px-4 py-3">{dict.adminDashboard.tablePublisherHeader}</th>
              <th className="px-4 py-3">{dict.adminDashboard.tablePeriodHeader}</th>
              <th className="px-4 py-3">{dict.publisherDashboard.amountLabel}</th>
              <th className="px-4 py-3">{dict.adminDashboard.tableMethodAccountHeader}</th>
              <th className="px-4 py-3">{dict.adminDashboard.tableStatusHeader}</th>
              <th className="px-4 py-3">{dict.publisherDashboard.transactionRefLabel}</th>
              <th className="px-4 py-3">{dict.adminDashboard.tableActionsHeader}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {payouts.map((p) => {
              const account = p.payoutAccount;
              const blockedReason = !account
                ? dict.adminDashboard.noAccountLinkedMessage
                : !account.isActive
                  ? dict.adminDashboard.accountInactiveMessage
                  : account.verificationStatus !== "VERIFIED"
                    ? dict.adminDashboard.accountUnverifiedMessage
                    : null;

              return (
                <tr key={p.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800">{p.publisher.profile?.fullName ?? p.publisher.email}</p>
                    <p className="text-caption text-slate-500">{p.publisher.email}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{p.revenuePeriod.label}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{formatAmount(p.amountCents, p.currency)}</td>
                  <td className="px-4 py-3 text-caption">
                    {account ? (
                      <>
                        <p className="text-slate-700">
                          {methodLabel(account.method)} — {account.maskedPreview}
                        </p>
                        {blockedReason && <p className="mt-0.5 font-medium text-red-600">{blockedReason}</p>}
                      </>
                    ) : (
                      <p className="font-medium text-red-600">{blockedReason}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-caption font-semibold ${STATUS_STYLE[p.status]}`}>
                      {statusLabel(p.status, dict)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{p.transactionReference ?? dict.adminDashboard.emptyValuePlaceholder}</td>
                  <td className="px-4 py-3">
                    <PayoutRowActions payoutId={p.id} status={p.status} />
                  </td>
                </tr>
              );
            })}
            {payouts.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                  {dict.adminDashboard.noPayoutsMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
