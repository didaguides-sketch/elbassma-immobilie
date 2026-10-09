import Link from "next/link";
import { auth } from "@/server/auth/auth.config";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { getAdminDashboardStats } from "@/server/services/admin-dashboard.service";
import { ModerationActionBadge } from "@/components/admin/ModerationActionBadge";

function StatCard({
  label,
  value,
  href,
  emphasis,
}: {
  label: string;
  value: number;
  href: string;
  emphasis?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded-2xl border p-5 shadow-sm transition hover:shadow-md ${
        emphasis && value > 0 ? "border-amber-300 bg-amber-50" : "border-gray-100 bg-white"
      }`}
    >
      <p className="text-3xl font-bold text-globanic-navy">{value}</p>
      <p className="mt-1 text-sm text-gray-500">{label}</p>
    </Link>
  );
}

export default async function AdminDashboardPage() {
  const session = await auth();
  const actor = { id: session!.user.id, role: session!.user.role };

  const stats = await getAdminDashboardStats(actor);

  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-globanic-navy">لوحة تحكم الإدارة</h1>
          <p className="text-sm text-gray-500">
            متصل باسم {session?.user.email} — الدور: {session?.user.role}
          </p>
        </div>
        <LogoutButton />
      </div>

      <h2 className="mb-3 text-sm font-semibold text-gray-500">قيد الانتظار</h2>
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="موارد قيد المراجعة" value={stats.pendingResources} href="/admin/resources" emphasis />
        <StatCard label="بلاغات مفتوحة" value={stats.openReports} href="/admin/reports" emphasis />
        <StatCard
          label="طلبات ناشرين معلّقة"
          value={stats.pendingPublisherApplications}
          href="/admin/publisher-applications"
          emphasis
        />
        <StatCard label="مستخدمون معلّقون" value={stats.suspendedUsers} href="/admin/users" emphasis />
      </div>

      <h2 className="mb-3 text-sm font-semibold text-gray-500">إحصاءات عامة</h2>
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="إجمالي المستخدمين" value={stats.totalUsers} href="/admin/users" />
        <StatCard label="موارد منشورة" value={stats.totalPublishedResources} href="/admin/resources" />
        <StatCard label="الجامعات" value={stats.totalUniversities} href="/admin/universities" />
        <StatCard label="المجالات" value={stats.totalDomains} href="/admin/domains" />
      </div>

      <div className="mb-8 flex flex-wrap gap-3">
        <Link
          href="/admin/publisher-applications"
          className="rounded-lg border border-globanic-blue px-4 py-2 text-sm font-semibold text-globanic-blue hover:bg-blue-50"
        >
          طلبات الناشرين
        </Link>
        <Link
          href="/admin/moderation-logs"
          className="rounded-lg border border-globanic-blue px-4 py-2 text-sm font-semibold text-globanic-blue hover:bg-blue-50"
        >
          سجل عمليات الإشراف
        </Link>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">آخر العمليات</h2>
          <Link href="/admin/moderation-logs" className="text-sm text-globanic-blue hover:underline">
            عرض السجل الكامل
          </Link>
        </div>

        {stats.recentActivity.length === 0 ? (
          <p className="text-sm text-gray-500">لا توجد عمليات إشراف مسجّلة بعد.</p>
        ) : (
          <ul className="space-y-3">
            {stats.recentActivity.map((log) => (
              <li key={log.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <ModerationActionBadge action={log.action} />
                  <span className="text-gray-600">{log.actor.email}</span>
                </div>
                <span className="text-xs text-gray-400">
                  {new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" }).format(
                    log.createdAt,
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
