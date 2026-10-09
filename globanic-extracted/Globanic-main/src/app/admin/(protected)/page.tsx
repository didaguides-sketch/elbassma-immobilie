import Link from "next/link";
import { auth } from "@/server/auth/auth";
import { getAdminDashboardStats } from "@/server/services/admin-dashboard.service";
import { ModerationActionBadge } from "@/components/admin/ModerationActionBadge";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import type { Dictionary } from "@/lib/i18n/get-dictionary";
import { formatDate } from "@/lib/i18n/format";

function LedgerCell({
  label,
  value,
  href,
  attention,
}: {
  label: string;
  value: number;
  href: string;
  attention?: boolean;
}) {
  return (
    <Link
      href={href}
      className="flex-1 px-4 py-5 text-center transition hover:bg-globanic-navy/[0.03]"
    >
      <p
        className={`font-serif text-h1 font-semibold tabular-nums ${
          attention && value > 0 ? "text-globanic-amber" : "text-globanic-navy"
        }`}
      >
        {value}
      </p>
      <p className="mt-1 text-caption text-slate-500">{label}</p>
    </Link>
  );
}

function periodStatusLabel(status: string, dict: Dictionary): string {
  if (status === "DRAFT") return dict.adminDashboard.periodStatusDraft;
  if (status === "FINALIZED") return dict.adminDashboard.dashboardPeriodStatusFinalized;
  return status;
}

export default async function AdminDashboardPage() {
  const locale = await getLocale();
  const dict = await getDictionary(locale);
  const session = await auth();
  const actor = { id: session!.user.id, role: session!.user.role };
  const stats = await getAdminDashboardStats(actor);

  return (
    <main className="container-page py-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <h1 className="font-serif text-h1 font-semibold text-globanic-navy">{dict.adminDashboard.adminHomeTitle}</h1>
          <p className="text-body-sm text-slate-500">
            {session?.user.email} · {session?.user.role}
          </p>
        </div>

        <div className="overflow-hidden rounded border border-globanic-navy/10 bg-white">
          <div className="border-b border-globanic-navy/10 bg-slate-50 px-4 py-2">
            <p className="text-caption font-semibold tracking-wide text-slate-500">{dict.adminDashboard.needsActionHeading}</p>
          </div>
          <div className="flex flex-col divide-y divide-globanic-navy/10 sm:flex-row sm:divide-x sm:divide-y-0">
            <LedgerCell label={dict.adminDashboard.pendingResourcesLabel} value={stats.pendingResources} href="/admin/resources" attention />
            <LedgerCell label={dict.adminDashboard.openReportsLabel} value={stats.openReports} href="/admin/reports" attention />
            <LedgerCell
              label={dict.adminDashboard.dashboardPublisherApplicationsLabel}
              value={stats.pendingPublisherApplications}
              href="/admin/publisher-applications"
              attention
            />
            <LedgerCell
              label={dict.adminDashboard.payoutAccountsPendingLabel}
              value={stats.pendingPayoutAccounts}
              href="/admin/payout-accounts"
              attention
            />
            <LedgerCell
              label={dict.adminDashboard.payoutsAwaitingLabel}
              value={stats.payoutsAwaitingPayment}
              href="/admin/payouts"
              attention
            />
            <LedgerCell label={dict.adminDashboard.suspendedAccountsLabel} value={stats.suspendedUsers} href="/admin/users" attention />
          </div>

          <div className="border-y border-globanic-navy/10 bg-slate-50 px-4 py-2">
            <p className="text-caption font-semibold tracking-wide text-slate-500">{dict.adminDashboard.overviewHeading}</p>
          </div>
          <div className="flex flex-col divide-y divide-globanic-navy/10 sm:flex-row sm:divide-x sm:divide-y-0">
            <LedgerCell label={dict.adminDashboard.usersLabel} value={stats.totalUsers} href="/admin/users" />
            <LedgerCell label={dict.adminDashboard.publishedResourcesLabel} value={stats.totalPublishedResources} href="/admin/resources" />
            <LedgerCell label={dict.adminDashboard.universitiesLabel} value={stats.totalUniversities} href="/admin/universities" />
            <LedgerCell label={dict.adminDashboard.domainsLabel} value={stats.totalDomains} href="/admin/domains" />
          </div>
        </div>

        <div className="mt-6 rounded border border-globanic-navy/10 bg-white p-5">
          <h2 className="mb-1 text-body-sm font-semibold text-slate-700">{dict.adminDashboard.latestRevenuePeriodHeading}</h2>
          {stats.latestRevenuePeriod ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium text-globanic-navy">{stats.latestRevenuePeriod.label}</p>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-caption font-semibold text-slate-700">
                  {periodStatusLabel(stats.latestRevenuePeriod.status, dict)}
                </span>
                <Link href="/admin/revenue-periods" className="text-body-sm font-medium text-globanic-blue hover:underline">
                  {dict.adminDashboard.manageRevenuePeriodsLink}
                </Link>
              </div>
            </div>
          ) : (
            <p className="text-body-sm text-slate-500">
              {dict.adminDashboard.noRevenuePeriodYetMessage}{" "}
              <Link href="/admin/revenue-periods" className="font-medium text-globanic-blue hover:underline">
                {dict.adminDashboard.createRevenuePeriodLink}
              </Link>
            </p>
          )}
        </div>

        <div className="mt-6 rounded border border-globanic-navy/10 bg-white">
          <div className="flex items-center justify-between border-b border-globanic-navy/10 px-4 py-3">
            <h2 className="text-body-sm font-semibold text-globanic-navy">{dict.adminDashboard.recentActivityHeading}</h2>
            <Link href="/admin/moderation-logs" className="text-body-sm text-globanic-blue hover:underline">
              {dict.adminDashboard.viewFullLogLink}
            </Link>
          </div>

          {stats.recentActivity.length === 0 ? (
            <p className="px-4 py-6 text-body-sm text-slate-500">{dict.adminDashboard.noModerationActivityMessage}</p>
          ) : (
            <ul className="divide-y divide-globanic-navy/10">
              {stats.recentActivity.map((log) => (
                <li key={log.id} className="flex items-center justify-between gap-3 border-s-2 border-globanic-blue px-4 py-3 text-body-sm">
                  <div className="flex items-center gap-2">
                    <ModerationActionBadge action={log.action} />
                    <span className="text-slate-600">{log.actor.email}</span>
                  </div>
                  <span className="text-caption tabular-nums text-slate-400">
                    {formatDate(log.createdAt, locale, { dateStyle: "short", timeStyle: "short" })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}
