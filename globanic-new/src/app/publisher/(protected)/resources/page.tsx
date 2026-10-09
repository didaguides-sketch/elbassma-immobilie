import Link from "next/link";
import type { Metadata } from "next";
import { auth } from "@/server/auth/auth.config";
import {
  listPublisherResources,
  type PublisherResourceTab,
} from "@/server/services/resource.service";
import { ResourceStatusBadge } from "@/components/resources/ResourceStatusBadge";

export const metadata: Metadata = { title: "مواردي" };

const TABS: { key: PublisherResourceTab; label: string }[] = [
  { key: "all", label: "الكل" },
  { key: "published", label: "منشورة" },
  { key: "pending", label: "قيد الانتظار" },
  { key: "draft", label: "مسودات" },
  { key: "rejected", label: "مرفوضة" },
  { key: "changes_requested", label: "تعديلات مطلوبة" },
];

export default async function PublisherResourcesPage({
  searchParams,
}: {
  searchParams: { tab?: string };
}) {
  const session = await auth();
  const actor = { id: session!.user.id, role: session!.user.role };

  const activeTab = (TABS.some((t) => t.key === searchParams.tab)
    ? searchParams.tab
    : "all") as PublisherResourceTab;

  const resources = await listPublisherResources(actor, activeTab);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-globanic-navy">مواردي</h1>
        <Link
          href="/publisher/resources/new"
          className="rounded-lg bg-globanic-blue px-5 py-2.5 text-sm font-semibold text-white hover:bg-globanic-blueLight"
        >
          + إنشاء مورد جديد
        </Link>
      </div>

      <nav className="mb-6 flex flex-wrap gap-2 border-b border-gray-200 pb-3">
        {TABS.map((tab) => (
          <Link
            key={tab.key}
            href={tab.key === "all" ? "/publisher/resources" : `/publisher/resources?tab=${tab.key}`}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              activeTab === tab.key
                ? "bg-globanic-blue text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {resources.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-12 text-center">
          <p className="mb-4 text-gray-500">لا توجد موارد في هذا القسم بعد.</p>
          <Link href="/publisher/resources/new" className="font-semibold text-globanic-blue">
            ابدأ بإنشاء مورد جديد
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-100 shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-right text-gray-500">
              <tr>
                <th className="px-4 py-3 font-medium">العنوان</th>
                <th className="px-4 py-3 font-medium">النوع</th>
                <th className="px-4 py-3 font-medium">الحالة</th>
                <th className="px-4 py-3 font-medium">المشاهدات</th>
                <th className="px-4 py-3 font-medium">التحميلات</th>
                <th className="px-4 py-3 font-medium">آخر تحديث</th>
              </tr>
            </thead>
            <tbody>
              {resources.map((r) => (
                <tr key={r.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/publisher/resources/${r.id}`}
                      className="font-medium text-globanic-navy hover:text-globanic-blue"
                    >
                      {r.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{r.type}</td>
                  <td className="px-4 py-3">
                    <ResourceStatusBadge status={r.status} />
                  </td>
                  <td className="px-4 py-3 text-gray-600">{r.viewsCount}</td>
                  <td className="px-4 py-3 text-gray-600">{r.downloadsCount}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Intl.DateTimeFormat("fr-FR").format(r.updatedAt)}
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
