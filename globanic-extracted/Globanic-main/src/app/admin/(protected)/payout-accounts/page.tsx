import { auth } from "@/server/auth/auth";
import { listPendingPayoutAccounts } from "@/server/services/payout-account.service";
import { PayoutAccountReviewCard } from "@/components/admin/PayoutAccountReviewCard";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";

export default async function AdminPayoutAccountsPage() {
  const dict = await getDictionary(await getLocale());
  const session = await auth();
  const actor = { id: session!.user.id, role: session!.user.role };
  const pending = await listPendingPayoutAccounts(actor);
  // Prisma Decimal instances aren't serializable across the server/client
  // boundary — convert to string before handing off to the client component.
  const serializable = pending.map((p) => ({
    ...p,
    publisher: {
      ...p.publisher,
      profile: p.publisher.profile
        ? {
            fullName: p.publisher.profile.fullName,
            payoutSharePercentage: p.publisher.profile.payoutSharePercentage?.toString() ?? null,
          }
        : null,
    },
  }));

  return (
    <main className="container-page py-10">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-2 font-serif text-h1 font-semibold text-globanic-navy">{dict.adminDashboard.payoutAccountsReviewPageTitle}</h1>
        <p className="mb-6 text-body-sm text-slate-500">
          {dict.adminDashboard.pendingAccountsCountMessage.replace("{count}", String(pending.length))}
        </p>

        <div className="space-y-4">
          {pending.length === 0 && (
            <p className="rounded border border-dashed border-slate-200 bg-white p-8 text-center text-slate-400">
              {dict.adminDashboard.noPendingAccountsMessage}
            </p>
          )}
          {serializable.map((account) => (
            <PayoutAccountReviewCard key={account.id} account={account} />
          ))}
        </div>
      </div>
    </main>
  );
}
