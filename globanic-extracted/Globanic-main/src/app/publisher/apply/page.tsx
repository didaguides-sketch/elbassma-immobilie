import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/server/auth/auth";
import { getMyLatestApplication } from "@/server/services/publisher-application.service";
import { listDomainsWithSpecialties, listUniversitiesWithFaculties } from "@/server/services/taxonomy.service";
import { PublisherApplicationForm } from "@/components/publisher/PublisherApplicationForm";
import { PublisherApplicationStatusBadge } from "@/components/publisher/PublisherApplicationStatusBadge";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { formatDate } from "@/lib/i18n/format";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary(await getLocale());
  return { title: dict.publisherDashboard.applyPageTitle };
}

export default async function PublisherApplyPage() {
  const locale = await getLocale();
  const dict = await getDictionary(locale);
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
        <h1 className="mb-2 text-2xl font-bold text-globanic-navy">{dict.publisherDashboard.applyHeading}</h1>

        {alreadyPublisher ? (
          <p className="text-gray-600">
            {dict.publisherDashboard.alreadyPublisherMessagePrefix}{" "}
            <a href="/publisher/dashboard" className="font-semibold text-globanic-blue">
              {dict.publisherDashboard.pageTitle}
            </a>
            .
          </p>
        ) : application?.status === "PENDING" ? (
          <div>
            <p className="mb-3 text-gray-600">{dict.publisherDashboard.applicationPendingMessage}</p>
            <PublisherApplicationStatusBadge status={application.status} />
            <p className="mt-3 text-sm text-gray-400">
              {dict.publisherDashboard.applicationSubmittedOn.replace("{date}", formatDate(application.createdAt, locale))}
            </p>
          </div>
        ) : (
          <>
            {application?.status === "REJECTED" && (
              <div className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-800">
                <p className="mb-1 font-semibold">{dict.publisherDashboard.applicationRejectedHeading}</p>
                <p>{application.rejectionReason}</p>
                <p className="mt-2 text-red-600">{dict.publisherDashboard.canReapplyMessage}</p>
              </div>
            )}
            {application?.status === "SUSPENDED" && (
              <div className="mb-6 rounded-lg bg-gray-100 p-4 text-sm text-gray-700">
                <p className="mb-1 font-semibold">{dict.publisherDashboard.applicationSuspendedMessage}</p>
                {application.rejectionReason && <p>{application.rejectionReason}</p>}
                <p className="mt-2">{dict.publisherDashboard.canReapplyMessage}</p>
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
