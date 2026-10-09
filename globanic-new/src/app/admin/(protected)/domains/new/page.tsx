import type { Metadata } from "next";
import { DomainForm } from "@/components/admin/DomainForm";
import { createDomainAction } from "@/server/actions/admin-domain.actions";

export const metadata: Metadata = { title: "مجال جديد" };

export default function NewDomainPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold text-globanic-navy">مجال جديد</h1>
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <DomainForm
          action={createDomainAction}
          submitLabel="إنشاء المجال"
          redirectOnSuccess="/admin/domains"
        />
      </div>
    </main>
  );
}
