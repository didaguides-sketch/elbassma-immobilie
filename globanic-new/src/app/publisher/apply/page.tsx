import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/server/auth/auth.config";
import { getMyLatestApplication } from "@/server/services/publisher-application.service";
import { listDomainsWithSpecialties, listUniversitiesWithFaculties } from "@/server/services/taxonomy.service";
import { PublisherApplicationForm } from "@/components/publisher/PublisherApplicationForm";
import { PublisherApplicationStatusBadge } from "@/components/publisher/PublisherApplicationStatusBadge";

export const metadata: Metadata = { title: "التقديم كناشر" };

export default async function PublisherApplyPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/publisher/apply");
  }

  const actor = { id: session.user.id, role: session.user.role };
  const alreadyPublisher = ["PUBLISHER", "ADMIN", "SUPER_ADMIN"].includes(actor.role);

  const application = alreadyPublisher ? null : await getMyLatestApplication(actor);

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-100">
        <h1 className="mb-2 text-2xl font-bold text-globanic-navy">التقديم للانضمام كناشر</h1>

        {alreadyPublisher ? (
          <p className="text-gray-600">
            حسابك يمتلك بالفعل صلاحيات النشر. يمكنك الانتقال إلى{" "}
            <a href="/publisher/dashboard" className="font-semibold text-globanic-blue">
              لوحة تحكم الناشر
            </a>
            .
          </p>
        ) : application?.status === "PENDING" ? (
          <div>
            <p className="mb-3 text-gray-600">طلبك قيد المراجعة من طرف الإدارة.</p>
            <PublisherApplicationStatusBadge status={application.status} />
            <p className="mt-3 text-sm text-gray-400">
              أُرسل في {new Intl.DateTimeFormat("fr-FR").format(application.createdAt)}
            </p>
          </div>
        ) : (
          <>
            {application?.status === "REJECTED" && (
              <div className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-800">
                <p className="mb-1 font-semibold">تم رفض طلبك السابق:</p>
                <p>{application.rejectionReason}</p>
                <p className="mt-2 text-red-600">يمكنك تقديم طلب جديد أدناه.</p>
              </div>
            )}
            {application?.status === "SUSPENDED" && (
              <div className="mb-6 rounded-lg bg-gray-100 p-4 text-sm text-gray-700">
                <p className="mb-1 font-semibold">تم تعليق صلاحيات النشر الخاصة بحسابك.</p>
                {application.rejectionReason && <p>{application.rejectionReason}</p>}
                <p className="mt-2">يمكنك تقديم طلب جديد أدناه.</p>
              </div>
            )}
            <ApplyForm />
          </>
        )}
      </div>
    </main>
  );
}

async function ApplyForm() {
  const [domains, universities] = await Promise.all([
    listDomainsWithSpecialties(),
    listUniversitiesWithFaculties(),
  ]);
  return <PublisherApplicationForm domains={domains} universities={universities} />;
}
