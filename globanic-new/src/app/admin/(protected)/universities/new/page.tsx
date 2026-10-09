import type { Metadata } from "next";
import { UniversityForm } from "@/components/admin/UniversityForm";
import { createUniversityAction } from "@/server/actions/admin-university.actions";

export const metadata: Metadata = { title: "جامعة جديدة" };

export default function NewUniversityPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold text-globanic-navy">جامعة جديدة</h1>
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <UniversityForm
          action={createUniversityAction}
          submitLabel="إنشاء الجامعة"
          redirectOnSuccess="/admin/universities"
        />
      </div>
    </main>
  );
}
