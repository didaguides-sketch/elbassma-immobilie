import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/server/auth/auth";
import { listUniversitiesForAdmin } from "@/server/services/university-admin.service";
import { deleteUniversityAction } from "@/server/actions/admin-university.actions";
import { DeleteEntityButton } from "@/components/admin/DeleteEntityButton";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary(await getLocale());
  return { title: dict.adminDashboard.universitiesPageTitle };
}

export default async function AdminUniversitiesPage() {
  const dict = await getDictionary(await getLocale());
  const session = await auth();
  const actor = { id: session!.user.id, role: session!.user.role };

  const universities = await listUniversitiesForAdmin(actor);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-h1 font-semibold text-globanic-navy">{dict.adminDashboard.universitiesPageTitle}</h1>
        <Link
          href="/admin/universities/new"
          className="rounded bg-globanic-blue px-4 py-2 text-body-sm font-semibold text-white hover:bg-globanic-blueLight"
        >
          {dict.adminDashboard.newUniversityCta}
        </Link>
      </div>

      {universities.length === 0 ? (
        <div className="rounded border border-dashed border-slate-300 bg-slate-50 p-12 text-center text-slate-500">
          {dict.adminDashboard.noUniversitiesMessage}
        </div>
      ) : (
        <div className="space-y-3">
          {universities.map((u) => (
            <div
              key={u.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded border border-slate-200 p-4 "
            >
              <div>
                <Link
                  href={`/admin/universities/${u.id}`}
                  className="font-semibold text-globanic-navy hover:underline"
                >
                  {u.name}
                </Link>
                <p className="text-caption text-slate-500">
                  {[u.city, u.country].filter(Boolean).join(dict.adminDashboard.listItemSeparator) ||
                    dict.adminDashboard.emptyValuePlaceholder}{" "}
                  ·{" "}
                  {dict.adminDashboard.universityStatsLine
                    .replace("{resources}", String(u._count.resources))
                    .replace("{faculties}", String(u._count.faculties))
                    .replace("{authors}", String(u._count.authors))}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/admin/universities/${u.id}`}
                  className="rounded border border-slate-300 px-3 py-1.5 text-body-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  {dict.adminDashboard.editCta}
                </Link>
                <DeleteEntityButton
                  onDelete={deleteUniversityAction.bind(null, u.id)}
                  confirmMessage={dict.adminDashboard.deleteEntityConfirm.replace("{name}", u.name)}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
