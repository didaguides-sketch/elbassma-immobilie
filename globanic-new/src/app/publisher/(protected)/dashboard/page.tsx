import Link from "next/link";
import { auth } from "@/server/auth/auth.config";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { getPublisherTotals, getResourceEventSeries } from "@/server/services/analytics-query.service";
import { StatCard } from "@/components/analytics/StatCard";
import { AnalyticsChart } from "@/components/analytics/AnalyticsChart";

export default async function PublisherDashboardPage() {
  const session = await auth();
  const actor = { id: session!.user.id, role: session!.user.role };

  const [totals, series] = await Promise.all([
    getPublisherTotals(actor),
    getResourceEventSeries(actor, { bucket: "day", days: 30 }),
  ]);

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-globanic-navy">لوحة تحكم الناشر</h1>
          <p className="text-sm text-gray-500">
            متصل باسم {session?.user.email} — الدور: {session?.user.role}
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/publisher/resources"
            className="rounded-lg bg-globanic-blue px-4 py-2 text-sm font-semibold text-white hover:bg-globanic-blueLight"
          >
            مواردي
          </Link>
          <Link
            href="/publisher/resources/new"
            className="rounded-lg border border-globanic-blue px-4 py-2 text-sm font-semibold text-globanic-blue hover:bg-blue-50"
          >
            + مورد جديد
          </Link>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="الموارد" value={totals.totalResources} />
        <StatCard label="المشاهدات" value={totals.totalViews} hint="مؤهَّلة فقط" />
        <StatCard label="التحميلات" value={totals.totalDownloads} hint="مؤهَّلة فقط" />
        <StatCard label="المحفوظات" value={totals.totalBookmarks} />
      </div>

      <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-gray-700">
          المشاهدات والتحميلات — آخر 30 يومًا
        </h2>
        <AnalyticsChart data={series} />
      </div>

      <div className="mb-6 rounded-lg bg-blue-50 p-4 text-sm text-blue-900">
        المشاهدات لا تُحتسب إلا من الصفحة العامة للمورد (Public Resource Page)، والتي ستُبنى
        في مرحلة لاحقة. إلى أن تُطلق، سيبقى عداد المشاهدات صفرًا — هذا سلوك متوقّع وليس خطأً؛
        عدم اختلاق مشاهدات وهمية من مجرد فتح ملف أو مراجعة الإدارة هو قرار مقصود لأن هذه
        البيانات حساسة ماليًا (قد تُستخدم لاحقًا في حساب أرباح الناشرين).
      </div>

      <LogoutButton />
    </main>
  );
}
