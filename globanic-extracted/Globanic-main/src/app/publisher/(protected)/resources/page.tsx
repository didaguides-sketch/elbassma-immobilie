import Link from "next/link";
import type { Metadata } from "next";
import { auth } from "@/server/auth/auth";
import {
  listPublisherResources,
  type PublisherResourceTab,
} from "@/server/services/resource.service";
import { ResourceStatusBadge } from "@/components/resources/ResourceStatusBadge";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import type { Dictionary } from "@/lib/i18n/get-dictionary";
import { formatDate } from "@/lib/i18n/format";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary(await getLocale());
  return { title: dict.publisherDashboard.resourcesPageTitle };
}

function buildTabs(dict: Dictionary): { key: PublisherResourceTab; label: string }[] {
  return [
    { key: "all", label: dict.publisherDashboard.tabAll },
    { key: "published", label: dict.publisherDashboard.statusPublishedStat },
    { key: "pending", label: dict.publisherDashboard.tabPending },
    { key: "draft", label: dict.publisherDashboard.statusDraftStat },
    { key: "rejected", label: dict.publisherDashboard.statusRejectedStat },
    { key: "changes_requested", label: dict.publisherDashboard.statusChangesRequestedStat },
  ];
}

export default async function PublisherResourcesPage({
  searchParams,
}: {
  searchParams: { tab?: string };
}) {
  const locale = await getLocale();
  const dict = await getDictionary(locale);
  const TABS = buildTabs(dict);

  const session = await auth();
  const actor = { id: session!.user.id, role: session!.user.role };

  const activeTab = (TABS.some((t) => t.key === searchParams.tab)
    ? searchParams.tab
    : "all") as PublisherResourceTab;

  const resources = await listPublisherResources(actor, activeTab);

  return (
    <main className="container-page py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-h1 font-semibold text-globanic-navy">{dict.publisherDashboard.resourcesPageTitle}</h1>
        <Link
          href="/publisher/resources/new"
          className="rounded bg-globanic-navy px-5 py-2.5 text-body-sm font-semibold text-white hover:bg-globanic-navyDeep"
        >
          {dict.publisherDashboard.createResourceCta}
        </Link>
      </div>

      <nav className="mb-6 flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {TABS.map((tab) => (
          <Link
            key={tab.key}
            href={tab.key === "all" ? "/publisher/resources" : `/publisher/resources?tab=${tab.key}`}
            className={`rounded-full px-4 py-1.5 text-body-sm font-medium transition ${
              activeTab === tab.key
                ? "bg-globanic-navy text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {resources.length === 0 ? (
        <div className="rounded border border-dashed border-slate-200 bg-white p-12 text-center">
          <p className="mb-4 text-body-sm text-slate-500">{dict.publisherDashboard.emptyTabMessage}</p>
          <Link href="/publisher/resources/new" className="font-semibold text-globanic-blue hover:underline">
            {dict.publisherDashboard.startCreatingCta}
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded border border-slate-200 bg-white">
          <table className="w-full text-body-sm">
            <thead className="bg-slate-50 text-start text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">{dict.publisherDashboard.tableTitleHeader}</th>
                <th className="px-4 py-3 font-medium">{dict.publisherDashboard.tableTypeHeader}</th>
                <th className="px-4 py-3 font-medium">{dict.publisherDashboard.tableStatusHeader}</th>
                <th className="px-4 py-3 font-medium">{dict.publisherDashboard.totalViewsLabel}</th>
                <th className="px-4 py-3 font-medium">{dict.publisherDashboard.totalDownloadsLabel}</th>
                <th className="px-4 py-3 font-medium">{dict.publisherDashboard.tableUpdatedHeader}</th>
              </tr>
            </thead>
            <tbody>
              {resources.map((r) => (
                <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/publisher/resources/${r.id}`}
                      className="font-medium text-globanic-navy hover:text-globanic-blue"
                    >
                      {r.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{dict.resourceType[r.type]}</td>
                  <td className="px-4 py-3">
                    <ResourceStatusBadge status={r.status} />
                  </td>
                  <td className="px-4 py-3 text-slate-600">{r.viewsCount}</td>
                  <td className="px-4 py-3 text-slate-600">{r.downloadsCount}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {formatDate(r.updatedAt, locale)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
