import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/server/auth/auth";
import { prisma } from "@/lib/prisma";
import { getUnreadNotificationCount } from "@/server/services/notification.service";
import {
  listFavoriteResources,
  listRecentlyViewedResources,
} from "@/server/services/analytics-tracking.service";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { ResourceCard } from "@/components/resources/ResourceCard";
import { StatCard } from "@/components/analytics/StatCard";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { formatDate } from "@/lib/i18n/format";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary(await getLocale());
  return { title: dict.account.pageTitle };
}

const PREVIEW_COUNT = 3;

export default async function AccountPage() {
  const locale = await getLocale();
  const dict = await getDictionary(locale);

  const session = await auth();
  const userId = session!.user.id;
  const actor = { id: userId };

  const [user, unreadCount, favoritesCount, followingCount, { favorites }, recentlyViewed] =
    await Promise.all([
      prisma.user.findUniqueOrThrow({ where: { id: userId }, include: { profile: true } }),
      getUnreadNotificationCount(actor),
      prisma.favorite.count({ where: { userId } }),
      prisma.follow.count({ where: { followerId: userId } }),
      listFavoriteResources(actor, { take: PREVIEW_COUNT }),
      listRecentlyViewedResources(actor, { take: PREVIEW_COUNT * 2 }),
    ]);

  return (
    <main className="container-page py-10">
      <div className="mx-auto max-w-4xl">
        {/* ---------- GREETING ---------- */}
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-serif text-h1 font-semibold text-globanic-navy">
              {dict.account.greeting.replace("{name}", user.profile?.fullName ?? user.email)}
            </h1>
            <p className="mt-1 text-body-sm text-slate-500">{user.email}</p>
          </div>
          <LogoutButton />
        </div>

        {/* ---------- REAL, DB-BACKED STATS ---------- */}
        <div className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatCard label={dict.account.savedResourcesStatLabel} value={favoritesCount} />
          <StatCard label={dict.account.followingStatLabel} value={followingCount} />
          <Link href="/notifications" className="block">
            <StatCard label={dict.account.unreadNotificationsStatLabel} value={unreadCount} />
          </Link>
        </div>

        {/* ---------- CONTINUE: RECENTLY VIEWED ---------- */}
        <section className="mb-10">
          <h2 className="mb-3 text-h4 font-semibold text-globanic-navy">{dict.account.continueHeading}</h2>
          {recentlyViewed.length === 0 ? (
            <div className="rounded border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
              <p className="mb-3 text-body-sm text-slate-500">
                {dict.account.noRecentlyViewedMessage}
              </p>
              <Link
                href="/resources"
                className="inline-block rounded bg-globanic-navy px-4 py-2 text-body-sm font-semibold text-white hover:bg-globanic-navyDeep"
              >
                {dict.publisher.browseResourcesCta}
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {recentlyViewed.map(({ resource }) => (
                <ResourceCard key={resource.id} resource={resource} />
              ))}
            </div>
          )}
        </section>

        {/* ---------- SAVED RESOURCES PREVIEW ---------- */}
        <section className="mb-10">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-h4 font-semibold text-globanic-navy">{dict.account.savedResourcesHeading}</h2>
            {favoritesCount > 0 && (
              <Link
                href="/account/favorites"
                className="text-body-sm font-medium text-globanic-blue hover:underline"
              >
                {dict.account.viewAllCount.replace("{count}", String(favoritesCount))}
              </Link>
            )}
          </div>
          {favorites.length === 0 ? (
            <div className="rounded border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
              <p className="mb-3 text-body-sm text-slate-500">
                {dict.account.noFavoritesPreviewMessage}
              </p>
              <Link
                href="/search"
                className="inline-block rounded border border-slate-300 px-4 py-2 text-body-sm font-semibold text-globanic-navy hover:bg-slate-50"
              >
                {dict.account.searchForResourcesCta}
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {favorites.map((resource) => (
                <ResourceCard key={resource.id} resource={resource} />
              ))}
            </div>
          )}
        </section>

        {/* ---------- QUICK LINKS ---------- */}
        <section className="mb-10">
          <h2 className="mb-3 text-h4 font-semibold text-globanic-navy">{dict.account.exploreHeading}</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { href: "/search", label: dict.search.formLabel },
              { href: "/domains", label: dict.account.quickLinkDomains },
              { href: "/universities", label: dict.nav.universities },
              { href: "/account/following", label: dict.account.followingHeading },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded border border-slate-200 bg-white px-4 py-3 text-center text-body-sm font-medium text-globanic-navy hover:border-globanic-blue"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </section>

        {/* ---------- ACCOUNT DETAILS ---------- */}
        <section className="mb-8 rounded border border-slate-200 p-5">
          <dl className="space-y-2 text-body-sm">
            <div className="flex justify-between border-b border-slate-100 py-2">
              <dt className="text-slate-500">{dict.account.roleFieldLabel}</dt>
              <dd className="font-medium text-slate-700">{user.role}</dd>
            </div>
            <div className="flex justify-between border-b border-slate-100 py-2">
              <dt className="text-slate-500">{dict.account.statusFieldLabel}</dt>
              <dd className="font-medium text-slate-700">{user.status}</dd>
            </div>
            <div className="flex justify-between py-2">
              <dt className="text-slate-500">{dict.account.memberSinceLabel}</dt>
              <dd className="font-medium text-slate-700">
                {formatDate(user.createdAt, locale, { year: "numeric", month: "numeric", day: "numeric" })}
              </dd>
            </div>
          </dl>
        </section>

        {user.role === "USER" && (
          <Link
            href="/publisher/apply"
            className="block rounded bg-globanic-blue px-4 py-2.5 text-center text-body-sm font-semibold text-white hover:opacity-90"
          >
            {dict.account.applyAsPublisherCta}
          </Link>
        )}
      </div>
    </main>
  );
}
