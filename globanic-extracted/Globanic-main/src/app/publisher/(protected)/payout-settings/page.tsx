import { auth } from "@/server/auth/auth";
import { listOwnPayoutAccounts } from "@/server/services/payout-account.service";
import { CcpPayoutAccountForm } from "@/components/publisher/CcpPayoutAccountForm";
import { SetPreferredPayoutAccountButton } from "@/components/publisher/SetPreferredPayoutAccountButton";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import type { Dictionary } from "@/lib/i18n/get-dictionary";
import { formatDate } from "@/lib/i18n/format";

function statusLabel(status: string, dict: Dictionary): string {
  switch (status) {
    case "PENDING_REVIEW":
      return dict.publisherDashboard.payoutStatusPendingReview;
    case "VERIFIED":
      return dict.publisherDashboard.payoutStatusVerified;
    case "REJECTED":
      return dict.publisherDashboard.resourceStatusRejected;
    default:
      return status;
  }
}

const STATUS_STYLE: Record<string, string> = {
  PENDING_REVIEW: "bg-amber-50 text-amber-800",
  VERIFIED: "bg-green-50 text-green-800",
  REJECTED: "bg-red-50 text-red-800",
};

export default async function PayoutSettingsPage() {
  const locale = await getLocale();
  const dict = await getDictionary(locale);
  const session = await auth();
  const actor = { id: session!.user.id, role: session!.user.role };
  const accounts = await listOwnPayoutAccounts(actor);
  // A publisher can in principle hold more than one simultaneously
  // active account (one per payout method — see the Phase 13.5B
  // architecture notes), even though only CCP/Baridi Mob is
  // submittable through this page today. Handled as a list rather than
  // a single "the" active account so this page doesn't silently break
  // the moment a second method exists — no new method is added in this
  // phase, only this page not assuming there can only ever be one.
  const activeAccounts = accounts.filter((a) => a.isActive);
  const previousAccounts = accounts.filter((a) => !a.isActive);

  return (
    <main className="container-page py-10">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-2 font-serif text-h1 font-semibold text-globanic-navy">{dict.publisherDashboard.payoutSettingsHeading}</h1>
        <p className="mb-6 text-body-sm text-slate-500">
          {dict.publisherDashboard.payoutSettingsIntro}
        </p>

        {activeAccounts.length === 0 ? (
          <div className="mb-6 rounded border border-dashed border-slate-200 bg-slate-50 p-5 text-body-sm text-slate-600">
            {dict.publisherDashboard.noPayoutAccountMessage}
          </div>
        ) : (
          <div className="mb-6 space-y-4">
            {activeAccounts.map((account) => (
              <div key={account.id} className="rounded border border-slate-200 bg-white p-5">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-body-sm font-semibold text-slate-700">
                    {account.method === "CCP_BARIDIMOB" ? "CCP / Baridi Mob" : account.method}
                  </h2>
                  <div className="flex flex-wrap items-center gap-2">
                    {account.preferred && (
                      <span className="rounded-full bg-globanic-blue/10 px-3 py-1 text-caption font-semibold text-globanic-blue">
                        {dict.publisherDashboard.preferredAccountBadge}
                      </span>
                    )}
                    <span
                      className={`rounded-full px-3 py-1 text-caption font-semibold ${STATUS_STYLE[account.verificationStatus]}`}
                    >
                      {statusLabel(account.verificationStatus, dict)}
                    </span>
                  </div>
                </div>
                <dl className="mb-3 grid grid-cols-2 gap-3 text-body-sm">
                  <div>
                    <dt className="text-slate-500">{dict.publisherDashboard.accountLabel}</dt>
                    <dd className="font-medium text-slate-700">{account.maskedPreview}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">{dict.publisherDashboard.legalFullNameLabel}</dt>
                    <dd className="font-medium text-slate-700">{account.legalFullName}</dd>
                  </div>
                  {account.verificationStatus === "REJECTED" && account.rejectionReason && (
                    <div className="col-span-2">
                      <dt className="text-slate-500">{dict.publisherDashboard.rejectionReasonAccountLabel}</dt>
                      <dd className="font-medium text-red-700">{account.rejectionReason}</dd>
                    </div>
                  )}
                </dl>
                {account.verificationStatus === "VERIFIED" && !account.preferred && (
                  <SetPreferredPayoutAccountButton payoutAccountId={account.id} />
                )}
                {account.verificationStatus === "PENDING_REVIEW" && (
                  <p className="text-caption text-slate-500">
                    {dict.publisherDashboard.cannotSetPreferredHint}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="mb-8 rounded border border-slate-200 bg-white p-5">
          <h2 className="mb-4 text-body-sm font-semibold text-slate-700">
            {activeAccounts.length > 0 ? dict.publisherDashboard.updatePaymentInfoHeading : dict.publisherDashboard.addPaymentInfoHeading}
          </h2>
          <CcpPayoutAccountForm />
        </div>

        {previousAccounts.length > 0 && (
          <section>
            <h2 className="mb-3 text-h4 font-semibold text-globanic-navy">{dict.publisherDashboard.previousAccountsHeading}</h2>
            <div className="divide-y divide-slate-100 rounded border border-slate-200 bg-white">
              {previousAccounts.map((a) => (
                <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                  <div>
                    <p className="text-body-sm font-medium text-slate-700">{a.maskedPreview}</p>
                    <p className="text-caption text-slate-400">
                      {formatDate(a.createdAt, locale)}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-caption font-semibold ${STATUS_STYLE[a.verificationStatus]}`}
                  >
                    {statusLabel(a.verificationStatus, dict)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
