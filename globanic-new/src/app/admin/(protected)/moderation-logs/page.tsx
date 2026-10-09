import type { Metadata } from "next";
import type { ModerationAction } from "@prisma/client";
import { auth } from "@/server/auth/auth.config";
import { listModerationLogsForAdmin } from "@/server/services/moderation-log.service";
import { ModerationActionBadge } from "@/components/admin/ModerationActionBadge";
import { ResourceListPagination } from "@/components/resources/ResourceListPagination";
import { resourceTypeToUrlSegment } from "@/lib/utils/resource-type";
import { parsePage } from "@/lib/utils/pagination";

export const metadata: Metadata = { title: "سجل عمليات الإشراف" };

const PAGE_SIZE = 30;

const ALL_ACTIONS: ModerationAction[] = [
  "SUBMIT",
  "APPROVE",
  "REJECT",
  "REQUEST_CHANGES",
  "UNPUBLISH",
  "DELETE",
  "VERIFY_PUBLISHER",
  "REJECT_PUBLISHER",
  "SUSPEND_PUBLISHER",
  "SUSPEND_USER",
  "ACTIVATE_USER",
  "CHANGE_ROLE",
  "RESOLVE_REPORT",
  "DISMISS_REPORT",
  "CREATE_UNIVERSITY",
  "UPDATE_UNIVERSITY",
  "DELETE_UNIVERSITY",
  "CREATE_DOMAIN",
  "UPDATE_DOMAIN",
  "DELETE_DOMAIN",
];

type SearchParams = {
  action?: string;
  actor?: string;
  from?: string;
  to?: string;
  page?: string;
};

function parseDate(raw?: string): Date | undefined {
  if (!raw) return undefined;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export default async function ModerationLogsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await auth();
  const actor = { id: session!.user.id, role: session!.user.role };

  // Never trust a raw client value for the filtered enum — only a known
  // ModerationAction value (or its absence) reaches the query.
  const actionFilter = ALL_ACTIONS.includes(searchParams.action as ModerationAction)
    ? (searchParams.action as ModerationAction)
    : undefined;

  const from = parseDate(searchParams.from);
  // Inclusive end-of-day for a date-only `to` input.
  const to = parseDate(searchParams.to);
  if (to) to.setHours(23, 59, 59, 999);

  const page = parsePage(searchParams.page);

  const { logs, hasMore } = await listModerationLogsForAdmin(actor, {
    action: actionFilter,
    actorEmail: searchParams.actor,
    from,
    to,
    take: PAGE_SIZE,
    skip: (page - 1) * PAGE_SIZE,
  });

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold text-globanic-navy">سجل عمليات الإشراف</h1>

      <form method="get" className="mb-6 flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">الإجراء</label>
          <select
            name="action"
            defaultValue={actionFilter ?? ""}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-globanic-blue"
          >
            <option value="">كل الإجراءات</option>
            {ALL_ACTIONS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">المُنفِّذ (البريد)</label>
          <input
            type="text"
            name="actor"
            defaultValue={searchParams.actor}
            placeholder="admin@example.com"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-globanic-blue"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">من تاريخ</label>
          <input
            type="date"
            name="from"
            defaultValue={searchParams.from}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-globanic-blue"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">إلى تاريخ</label>
          <input
            type="date"
            name="to"
            defaultValue={searchParams.to}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-globanic-blue"
          />
        </div>
        <button
          type="submit"
          className="rounded-lg bg-globanic-blue px-5 py-2 text-sm font-semibold text-white hover:bg-globanic-blueLight"
        >
          تصفية
        </button>
        {(actionFilter || searchParams.actor || searchParams.from || searchParams.to) && (
          <a href="/admin/moderation-logs" className="text-sm text-gray-500 underline">
            إعادة تعيين
          </a>
        )}
      </form>

      {logs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-12 text-center text-gray-500">
          لا توجد سجلات مطابقة لهذه الفلاتر.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-100 shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-right text-gray-500">
              <tr>
                <th className="px-4 py-3 font-medium">التاريخ</th>
                <th className="px-4 py-3 font-medium">المُنفِّذ</th>
                <th className="px-4 py-3 font-medium">الإجراء</th>
                <th className="px-4 py-3 font-medium">الهدف</th>
                <th className="px-4 py-3 font-medium">السبب</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-t border-gray-100 align-top hover:bg-gray-50">
                  <td className="whitespace-nowrap px-4 py-3 text-gray-500">
                    {new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" }).format(
                      log.createdAt,
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{log.actor.email}</td>
                  <td className="px-4 py-3">
                    <ModerationActionBadge action={log.action} />
                  </td>
                  <td className="px-4 py-3">
                    {log.resource ? (
                      <a
                        href={`/resources/${resourceTypeToUrlSegment(log.resource.type)}/${log.resource.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-globanic-blue hover:underline"
                      >
                        {log.resource.title}
                      </a>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="max-w-xs px-4 py-3 text-gray-600">{log.reason ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ResourceListPagination page={page} hasMore={hasMore} />
    </main>
  );
}
