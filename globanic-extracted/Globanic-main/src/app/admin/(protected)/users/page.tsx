import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/server/auth/auth";
import { listUsers } from "@/server/services/user-admin.service";
import type { Role } from "@/server/auth/rbac";
import type { AccountStatus } from "@prisma/client";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import type { Dictionary } from "@/lib/i18n/get-dictionary";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary(await getLocale());
  return { title: dict.adminDashboard.usersPageTitle };
}

// Role filter values are intentionally left as literal role codes
// (USER / PUBLISHER / ADMIN / SUPER_ADMIN) rather than translated —
// same pre-existing convention as the role <select> in
// UserAdminActions.tsx: these are technical identifiers shown verbatim
// to admins, not prose. Only "ALL" gets a translated label.
function buildRoleFilters(dict: Dictionary): { value: Role | "ALL"; label: string }[] {
  return [
    { value: "ALL", label: dict.adminDashboard.allRolesFilterLabel },
    { value: "USER", label: "USER" },
    { value: "PUBLISHER", label: "PUBLISHER" },
    { value: "ADMIN", label: "ADMIN" },
    { value: "SUPER_ADMIN", label: "SUPER_ADMIN" },
  ];
}

function buildStatusFilters(dict: Dictionary): { value: AccountStatus | "ALL"; label: string }[] {
  return [
    { value: "ALL", label: dict.adminDashboard.allStatusesFilterLabel },
    { value: "ACTIVE", label: dict.adminDashboard.statusActiveLabel },
    { value: "SUSPENDED", label: dict.adminDashboard.statusSuspendedLabel },
  ];
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: { q?: string; role?: string; status?: string };
}) {
  const dict = await getDictionary(await getLocale());
  const ROLE_FILTERS = buildRoleFilters(dict);
  const STATUS_FILTERS = buildStatusFilters(dict);

  const session = await auth();
  const actor = { id: session!.user.id, role: session!.user.role };

  const roleFilter = ROLE_FILTERS.some((r) => r.value === searchParams.role)
    ? (searchParams.role as Role | "ALL")
    : "ALL";
  const statusFilter = STATUS_FILTERS.some((s) => s.value === searchParams.status)
    ? (searchParams.status as AccountStatus | "ALL")
    : "ALL";

  const { users } = await listUsers(actor, {
    query: searchParams.q,
    role: roleFilter === "ALL" ? undefined : roleFilter,
    status: statusFilter === "ALL" ? undefined : statusFilter,
  });

  function buildHref(overrides: { role?: string; status?: string }) {
    const params = new URLSearchParams();
    if (searchParams.q) params.set("q", searchParams.q);
    params.set("role", overrides.role ?? roleFilter);
    params.set("status", overrides.status ?? statusFilter);
    return `/admin/users?${params.toString()}`;
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="mb-6 text-h1 font-semibold text-globanic-navy">{dict.adminDashboard.usersPageTitle}</h1>

      <form method="get" className="mb-6 flex flex-wrap gap-3">
        <input
          type="text"
          name="q"
          defaultValue={searchParams.q}
          placeholder={dict.adminDashboard.searchByEmailPlaceholder}
          className="min-w-[220px] flex-1 rounded border border-slate-300 px-4 py-2 text-body-sm outline-none focus:border-globanic-blue"
        />
        <input type="hidden" name="role" value={roleFilter} />
        <input type="hidden" name="status" value={statusFilter} />
        <button
          type="submit"
          className="rounded bg-globanic-blue px-5 py-2 text-body-sm font-semibold text-white hover:bg-globanic-blueLight"
        >
          {dict.adminDashboard.searchCta}
        </button>
      </form>

      <div className="mb-4 flex flex-wrap gap-2">
        {ROLE_FILTERS.map((r) => (
          <a
            key={r.value}
            href={buildHref({ role: r.value })}
            className={`rounded-full px-4 py-1.5 text-body-sm font-medium transition ${
              roleFilter === r.value
                ? "bg-globanic-navy text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {r.label}
          </a>
        ))}
      </div>
      <div className="mb-6 flex flex-wrap gap-2">
        {STATUS_FILTERS.map((s) => (
          <a
            key={s.value}
            href={buildHref({ status: s.value })}
            className={`rounded-full px-4 py-1.5 text-body-sm font-medium transition ${
              statusFilter === s.value
                ? "bg-globanic-blue text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {s.label}
          </a>
        ))}
      </div>

      {users.length === 0 ? (
        <div className="rounded border border-dashed border-slate-300 bg-slate-50 p-12 text-center text-slate-500">
          {dict.adminDashboard.noUsersFoundMessage}
        </div>
      ) : (
        <div className="overflow-x-auto rounded border border-slate-200">
          <table className="w-full text-body-sm">
            <thead className="bg-slate-50 text-start text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">{dict.adminDashboard.tableEmailHeader}</th>
                <th className="px-4 py-3 font-medium">{dict.adminDashboard.tableNameHeader}</th>
                <th className="px-4 py-3 font-medium">{dict.adminDashboard.roleLabel}</th>
                <th className="px-4 py-3 font-medium">{dict.adminDashboard.tableStatusHeader}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-slate-200 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/users/${u.id}`}
                      className="font-medium text-globanic-navy hover:text-globanic-blue"
                    >
                      {u.email}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{u.profile?.fullName ?? dict.adminDashboard.emptyValuePlaceholder}</td>
                  <td className="px-4 py-3 text-slate-600">{u.role}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-3 py-1 text-caption font-semibold ${
                        u.status === "ACTIVE" ? "bg-green-100 text-green-800" : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {u.status === "ACTIVE"
                        ? dict.adminDashboard.statusActiveLabel
                        : u.status === "SUSPENDED"
                          ? dict.adminDashboard.statusSuspendedLabel
                          : dict.adminDashboard.statusDeletedLabel}
                    </span>
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
