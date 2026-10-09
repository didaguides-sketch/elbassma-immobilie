import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/server/auth/auth";
import { listDomainsForAdmin } from "@/server/services/domain-admin.service";
import { deleteDomainAction } from "@/server/actions/admin-domain.actions";
import { DeleteEntityButton } from "@/components/admin/DeleteEntityButton";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary(await getLocale());
  return { title: dict.adminDashboard.domainsPageTitle };
}

export default async function AdminDomainsPage() {
  const dict = await getDictionary(await getLocale());
  const session = await auth();
  const actor = { id: session!.user.id, role: session!.user.role };

  const domains = await listDomainsForAdmin(actor);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-h1 font-semibold text-globanic-navy">{dict.adminDashboard.domainsPageTitle}</h1>
        <Link
          href="/admin/domains/new"
          className="rounded bg-globanic-blue px-4 py-2 text-body-sm font-semibold text-white hover:bg-globanic-blueLight"
        >
          {dict.adminDashboard.newDomainCta}
        </Link>
      </div>

      {domains.length === 0 ? (
        <div className="rounded border border-dashed border-slate-300 bg-slate-50 p-12 text-center text-slate-500">
          {dict.adminDashboard.noDomainsMessage}
        </div>
      ) : (
        <div className="space-y-3">
          {domains.map((d) => (
            <div
              key={d.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded border border-slate-200 p-4 "
            >
              <div>
                <Link
                  href={`/admin/domains/${d.id}`}
                  className="font-semibold text-globanic-navy hover:underline"
                >
                  {d.icon ? `${d.icon} ` : ""}
                  {d.name}
                </Link>
                <p className="text-caption text-slate-500">
                  {dict.adminDashboard.domainStatsLine
                    .replace("{order}", String(d.order))
                    .replace("{resources}", String(d._count.resources))
                    .replace("{specialties}", String(d._count.specialties))}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/admin/domains/${d.id}`}
                  className="rounded border border-slate-300 px-3 py-1.5 text-body-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  {dict.adminDashboard.editCta}
                </Link>
                <DeleteEntityButton
                  onDelete={deleteDomainAction.bind(null, d.id)}
                  confirmMessage={dict.adminDashboard.deleteEntityConfirm.replace("{name}", d.name)}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
