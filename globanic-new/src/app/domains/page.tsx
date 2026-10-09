import type { Metadata } from "next";
import Link from "next/link";
import { listDomainsWithSpecialties } from "@/server/services/taxonomy.service";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "المجالات",
  description: "استكشف الموارد الأكاديمية المنشورة على Globanic حسب المجال والتخصص.",
  path: "/domains",
});

export default async function DomainsPage() {
  const domains = await listDomainsWithSpecialties();

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold text-globanic-navy">استكشف حسب المجال</h1>

      {domains.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-12 text-center text-gray-500">
          لا توجد مجالات مسجّلة حاليًا.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {domains.map((d) => (
            <Link
              key={d.id}
              href={`/domains/${d.slug}`}
              className="block rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition hover:shadow-md"
            >
              <h3 className="mb-1 font-semibold text-globanic-navy">{d.name}</h3>
              <p className="text-xs text-gray-400">
                {d.specialties.length > 0
                  ? `${d.specialties.length} تخصص`
                  : "بدون تخصصات فرعية بعد"}
              </p>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
