import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/server/auth/auth.config";
import { listUsers } from "@/server/services/user-admin.service";
import type { Role } from "@/server/auth/rbac";
import type { AccountStatus } from "@prisma/client";

export const metadata: Metadata = { title: "إدارة المستخدمين" };

const ROLE_FILTERS: { value: Role | "ALL"; label: string }[] = [
  { value: "ALL", label: "كل الأدوار" },
  { value: "USER", label: "USER" },
  { value: "PUBLISHER", label: "PUBLISHER" },
  { value: "ADMIN", label: "ADMIN" },
  { value: "SUPER_ADMIN", label: "SUPER_ADMIN" },
];

const STATUS_FILTERS: { value: AccountStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "كل الحالات" },
  { value: "ACTIVE", label: "نشط" },
  { value: "SUSPENDED", label: "معلَّق" },
];

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: { q?: string; role?: string; status?: string };
}) {
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
      <h1 className="mb-6 text-2xl font-bold text-globanic-navy">إدارة المستخدمين</h1>

      <form method="get" className="mb-6 flex flex-wrap gap-3">
        <input
          type="text"
          name="q"
          defaultValue={searchParams.q}
          placeholder="البحث بالبريد الإلكتروني..."
          className="min-w-[220px] flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:border-globanic-blue"
        />
        <input type="hidden" name="role" value={roleFilter} />
        <input type="hidden" name="status" value={statusFilter} />
        <button
          type="submit"
          className="rounded-lg bg-globanic-blue px-5 py-2 text-sm font-semibold text-white hover:bg-globanic-blueLight"
        >
          بحث
        </button>
      </form>

      <div className="mb-4 flex flex-wrap gap-2">
        {ROLE_FILTERS.map((r) => (
          <a
            key={r.value}
            href={buildHref({ role: r.value })}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              roleFilter === r.value
                ? "bg-globanic-navy text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
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
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              statusFilter === s.value
                ? "bg-globanic-blue text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {s.label}
          </a>
        ))}
      </div>

      {users.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-12 text-center text-gray-500">
          لا يوجد مستخدمون مطابقون لهذا البحث.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-100 shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-right text-gray-500">
              <tr>
                <th className="px-4 py-3 font-medium">البريد الإلكتروني</th>
                <th className="px-4 py-3 font-medium">الاسم</th>
                <th className="px-4 py-3 font-medium">الدور</th>
                <th className="px-4 py-3 font-medium">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/users/${u.id}`}
                      className="font-medium text-globanic-navy hover:text-globanic-blue"
                    >
                      {u.email}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{u.profile?.fullName ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-600">{u.role}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        u.status === "ACTIVE" ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-700"
                      }`}
                    >
                      {u.status === "ACTIVE" ? "نشط" : u.status === "SUSPENDED" ? "معلَّق" : "محذوف"}
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
