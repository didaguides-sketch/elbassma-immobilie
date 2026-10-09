import type { Metadata } from "next";
import type { ModerationAction } from "@prisma/client";
import { auth } from "@/server/auth/auth";
import { listModerationLogsForAdmin } from "@/server/services/moderation-log.service";
import { ModerationActionBadge } from "@/components/admin/ModerationActionBadge";
import { ResourceListPagination } from "@/components/resources/ResourceListPagination";
import { resourceTypeToUrlSegment } from "@/lib/utils/resource-type";
import { parsePage } from "@/lib/utils/pagination";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { formatDate } from "@/lib/i18n/format";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary(await getLocale());
  return { title: dict.adminDashboard.moderationLogsPageTitle };
}

const PAGE_SIZE = 30;

// NOTE (Batch 7C): these are filter *values*, matched exactly against
// the ModerationAction enum stored in the database — shown verbatim in
// the <select> below (not translated), same established convention as
// the role codes in users/page.tsx (Batch 7A) and the resource-type
// values in the admin users/resources filters. The *display* label for
// each action (in the table rows, via ModerationActionBadge) is
// localized; this raw filter list is intentionally left as-is.
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
  "FINALIZE_REVENUE_PERIOD",
  "MARK_PAYOUT_PAID",
  "SUBMIT_PAYOUT_ACCOUNT",
  "UPDATE_PAYOUT_ACCOUNT",
  "VERIFY_PAYOUT_ACCOUNT",
  "REJECT_PAYOUT_ACCOUNT",
  "DEACTIVATE_PAYOUT_ACCOUNT",
  "REVEAL_PAYOUT_ACCOUNT_DETAILS",
  "APPROVE_PAYOUT",
  "MARK_PAYOUT_FAILED",
  "SET_PUBLISHER_SHARE_PERCENTAGE",
  "SET_PREFERRED_PAYOUT_ACCOUNT",
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
  const locale = await getLocale();
  const dict = await getDictionary(locale);
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
      <h1 className="mb-6 text-h1 font-semibold text-globanic-navy">{dict.adminDashboard.moderationLogsPageTitle}</h1>

      <form method="get" className="mb-6 flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="moderation-logs-filter-action" className="mb-1 block text-caption font-medium text-slate-600">{dict.adminDashboard.actionFilterLabel}</label>
          <select id="moderation-logs-filter-action"
          name="action"
          defaultValue={actionFilter ?? ""}
          className="rounded border border-slate-300 px-3 py-2 text-body-sm outline-none focus:border-globanic-blue"
          >
          <option value="">{dict.adminDashboard.allActionsFilterLabel}</option>
          {ALL_ACTIONS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
        </select>
      </div>
      <div>
        <label htmlFor="moderation-logs-filter-actor" className="mb-1 block text-caption font-medium text-slate-600">{dict.adminDashboard.actorEmailFilterLabel}</label>
        <input id="moderation-logs-filter-actor"
        type="text"
        name="actor"
        defaultValue={searchParams.actor}
        placeholder="admin@example.com"
        className="rounded border border-slate-300 px-3 py-2 text-body-sm outline-none focus:border-globanic-blue"
        />
      </div>
      <div>
        <label htmlFor="moderation-logs-filter-from" className="mb-1 block text-caption font-medium text-slate-600">{dict.adminDashboard.fromDateLabel}</label>
        <input id="moderation-logs-filter-from"
        type="date"
        name="from"
        defaultValue={searchParams.from}
        className="rounded border border-slate-300 px-3 py-2 text-body-sm outline-none focus:border-globanic-blue"
        />
      </div>
      <div>
        <label htmlFor="moderation-logs-filter-to" className="mb-1 block text-caption font-medium text-slate-600">{dict.adminDashboard.toDateLabel}</label>
        <input id="moderation-logs-filter-to"
        type="date"
        name="to"
        defaultValue={searchParams.to}
        className="rounded border border-slate-300 px-3 py-2 text-body-sm outline-none focus:border-globanic-blue"
        />
      </div>
      <button
      type="submit"
      className="rounded bg-globanic-blue px-5 py-2 text-body-sm font-semibold text-white hover:bg-globanic-blueLight"
      >
      {dict.adminDashboard.filterCta}
    </button>
    {(actionFilter || searchParams.actor || searchParams.from || searchParams.to) && (
        <a href="/admin/moderation-logs" className="text-body-sm text-slate-500 underline">
          {dict.adminDashboard.resetFiltersCta}
        </a>
      )}
  </form>

  {logs.length === 0 ? (
      <div className="rounded border border-dashed border-slate-300 bg-slate-50 p-12 text-center text-slate-500">
        {dict.adminDashboard.noLogsMatchMessage}
      </div>
    ) : (
      <div className="overflow-x-auto rounded border border-slate-200">
        <table className="w-full text-body-sm">
          <thead className="bg-slate-50 text-start text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">{dict.adminDashboard.dateColumnHeader}</th>
              <th className="px-4 py-3 font-medium">{dict.adminDashboard.actorColumnHeader}</th>
              <th className="px-4 py-3 font-medium">{dict.adminDashboard.actionFilterLabel}</th>
              <th className="px-4 py-3 font-medium">{dict.adminDashboard.targetColumnHeader}</th>
              <th className="px-4 py-3 font-medium">{dict.adminDashboard.reasonColumnHeader}</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
                  <tr key={log.id} className="border-t border-slate-200 align-top hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                      {formatDate(log.createdAt, locale, { dateStyle: "short", timeStyle: "short" })}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{log.actor.email}</td>
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
                      ) : log.metadata ? (
                        // Payout-related actions have no `resource` — the
                        // non-sensitive context (amount, masked account
                          // preview, publisher/period id) lives in metadata
                        // instead. Never render encryptedDetails/decrypted
                        // fields here — metadata never contains them by
                        // construction (see payout-account.service.ts).
                        <code className="text-caption text-slate-500">
                          {JSON.stringify(log.metadata)}
                        </code>
                      ) : (
                        <span className="text-slate-400">{dict.adminDashboard.emptyValuePlaceholder}</span>
                      )}
                  </td>
                  <td className="max-w-xs px-4 py-3 text-slate-600">{log.reason ?? dict.adminDashboard.emptyValuePlaceholder}</td>
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
