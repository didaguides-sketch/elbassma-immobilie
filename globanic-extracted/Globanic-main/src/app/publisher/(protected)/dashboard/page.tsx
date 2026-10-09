import Link from "next/link";
import { auth } from "@/server/auth/auth";
import { prisma } from "@/lib/prisma";
import { LogoutButton } from "@/components/auth/LogoutButton";
import {
  getPublisherTotals,
  getResourceEventSeries,
} from "@/server/services/analytics-query.service";
import { listPublisherResources } from "@/server/services/resource.service";
import { StatCard } from "@/components/analytics/StatCard";
import { AnalyticsChart } from "@/components/analytics/AnalyticsChart";
import { ReferralLinkPanel } from "@/components/publisher/ReferralLinkPanel";
import { ResourceStatusBadge } from "@/components/resources/ResourceStatusBadge";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { formatDate } from "@/lib/i18n/format";

const RECENT_COUNT = 5;

export default async function PublisherDashboardPage() {
  const locale = await getLocale();
  const dict = await getDictionary(locale);
  const session = await auth();
  const actor = { id: session!.user.id, role: session!.user.role };

  const [totals, series, allResources, publisherProfile] = await Promise.all([
    getPublisherTotals(actor),
    getResourceEventSeries(actor, { bucket: "day", days: 30 }),
    listPublisherResources(actor, "all"),
    prisma.publisherProfile.findUnique({
      where: { userId: actor.id },
      select: { verifiedAt: true },
    }),
  ]);

  const recentResources = allResources.slice(0, RECENT_COUNT);
  const isVerified = !!publisherProfile?.verifiedAt;

  return (
    <main className="container-page py-10">
      <div className="mx-auto max-w-4xl">
        {/* ---------- HEADER ---------- */}
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <h1 className="font-serif text-h1 font-semibold text-globanic-navy">
                {dict.publisherDashboard.pageTitle}
              </h1>
              <span
                className={`rounded-full px-2.5 py-0.5 text-caption font-semibold ${
                  isVerified ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-600"
                }`}
              >
                {isVerified ? dict.publisherDashboard.verifiedBadge : dict.publisherDashboard.pendingVerificationBadge}
              </span>
            </div>
            <p className="text-body-sm text-slate-500">
              {dict.publisherDashboard.signedInAs
                .replace("{email}", session?.user.email ?? "")
                .replace("{role}", session?.user.role ?? "")}
            </p>
          </div>
          <LogoutButton />
        </div>

        {/* ---------- QUICK ACTIONS ---------- */}
        <div className="mb-8 flex flex-wrap gap-3">
          <Link
            href="/publisher/resources/new"
            className="rounded bg-globanic-navy px-4 py-2 text-body-sm font-semibold text-white hover:bg-globanic-navyDeep"
          >
            {dict.publisherDashboard.newResourceCta}
          </Link>
          <Link
            href="/publisher/resources"
            className="rounded border border-slate-300 px-4 py-2 text-body-sm font-semibold text-globanic-navy hover:bg-slate-50"
          >
            {dict.publisherDashboard.manageResourcesCta}
          </Link>
          <Link
            href={`/publishers/${actor.id}`}
            className="rounded border border-slate-300 px-4 py-2 text-body-sm font-semibold text-globanic-navy hover:bg-slate-50"
          >
            {dict.publisherDashboard.publicProfileCta}
          </Link>
          <Link
            href="/publisher/earnings"
            className="rounded border border-slate-300 px-4 py-2 text-body-sm font-semibold text-globanic-navy hover:bg-slate-50"
          >
            {dict.publisherDashboard.earningsHeading}
          </Link>
          <Link
            href="/publisher/payout-settings"
            className="rounded border border-slate-300 px-4 py-2 text-body-sm font-semibold text-globanic-navy hover:bg-slate-50"
          >
            {dict.publisherDashboard.payoutSettingsHeading}
          </Link>
        </div>

        {/* ---------- OVERVIEW: TOTALS ---------- */}
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label={dict.publisherDashboard.totalResourcesLabel} value={totals.totalResources} />
          <StatCard label={dict.publisherDashboard.totalViewsLabel} value={totals.totalViews} hint={dict.publisherDashboard.eligibleOnlyHint} />
          <StatCard label={dict.publisherDashboard.totalDownloadsLabel} value={totals.totalDownloads} hint={dict.publisherDashboard.eligibleOnlyHint} />
          <StatCard label={dict.publisherDashboard.totalBookmarksLabel} value={totals.totalBookmarks} />
        </div>

        {/* ---------- OVERVIEW: STATUS BREAKDOWN ---------- */}
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <StatCard label={dict.publisherDashboard.statusPublishedStat} value={totals.byStatus.PUBLISHED ?? 0} />
          <StatCard
            label={dict.publisherDashboard.statusPendingReviewStat}
            value={(totals.byStatus.SUBMITTED ?? 0) + (totals.byStatus.UNDER_REVIEW ?? 0)}
          />
          <StatCard label={dict.publisherDashboard.statusDraftStat} value={totals.byStatus.DRAFT ?? 0} />
          <StatCard label={dict.publisherDashboard.statusChangesRequestedStat} value={totals.byStatus.CHANGES_REQUESTED ?? 0} />
          <StatCard label={dict.publisherDashboard.statusRejectedStat} value={totals.byStatus.REJECTED ?? 0} />
        </div>

        {/* ---------- ACTIVITY CHART ---------- */}
        <div className="mb-8 rounded border border-slate-200 bg-white p-5">
          <h2 className="mb-4 text-body-sm font-semibold text-slate-700">
            {dict.publisherDashboard.activityChartHeading}
          </h2>
          <AnalyticsChart data={series} />
        </div>

        {/* ---------- RECENT RESOURCES ---------- */}
        <section className="mb-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-h4 font-semibold text-globanic-navy">{dict.publisherDashboard.recentResourcesHeading}</h2>
            {allResources.length > RECENT_COUNT && (
              <Link
                href="/publisher/resources"
                className="text-body-sm font-medium text-globanic-blue hover:underline"
              >
                {dict.publisherDashboard.viewAllCount.replace("{count}", String(allResources.length))}
              </Link>
            )}
          </div>

          {recentResources.length === 0 ? (
            <div className="rounded border border-dashed border-slate-200 bg-white p-10 text-center">
              <p className="mb-4 text-body-sm text-slate-500">{dict.publisherDashboard.noResourcesYetMessage}</p>
              <Link
                href="/publisher/resources/new"
                className="inline-block rounded bg-globanic-navy px-4 py-2 text-body-sm font-semibold text-white hover:bg-globanic-navyDeep"
              >
                {dict.publisherDashboard.createFirstResourceCta}
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 rounded border border-slate-200 bg-white">
              {recentResources.map((r) => (
                <Link
                  key={r.id}
                  href={`/publisher/resources/${r.id}`}
                  className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-slate-50"
                >
                  <span className="font-medium text-globanic-navy">{r.title}</span>
                  <span className="flex items-center gap-3">
                    <span className="text-caption text-slate-400">
                      {formatDate(r.updatedAt, locale)}
                    </span>
                    <ResourceStatusBadge status={r.status} />
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* ---------- REFERRAL LINK (existing, untouched logic) ---------- */}
        <ReferralLinkPanel publisherUserId={actor.id} />

        {/* ---------- ANALYTICS NOTE (corrected: views ARE recorded today) ---------- */}
        <div className="mb-8 rounded border border-slate-200 bg-slate-50 p-4 text-body-sm text-slate-600">
          {dict.publisherDashboard.analyticsNote}
        </div>
      </div>
    </main>
  );
}
