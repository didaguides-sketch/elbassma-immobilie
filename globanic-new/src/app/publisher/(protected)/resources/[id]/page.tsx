import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/server/auth/auth.config";
import { getResourceForActor, NotFoundError } from "@/server/services/resource.service";
import { ForbiddenError } from "@/server/auth/rbac";
import { updateResourceAction } from "@/server/actions/resource.actions";
import { listDomainsWithSpecialties, listUniversitiesWithFaculties } from "@/server/services/taxonomy.service";
import { getResourceAnalyticsSummary } from "@/server/services/analytics-query.service";
import { prisma } from "@/lib/prisma";
import { ResourceForm } from "@/components/resources/ResourceForm";
import { ResourceStatusBadge } from "@/components/resources/ResourceStatusBadge";
import { SubmitForReviewButton } from "@/components/resources/SubmitForReviewButton";
import { DeleteDraftButton } from "@/components/resources/DeleteDraftButton";
import { ResourceDocumentUploadForm } from "@/components/resources/ResourceDocumentUploadForm";
import { ResourceCoverUploadForm } from "@/components/resources/ResourceCoverUploadForm";
import { StatCard } from "@/components/analytics/StatCard";
import { BookmarkToggleButton } from "@/components/analytics/BookmarkToggleButton";

export const metadata: Metadata = { title: "تعديل المورد" };

export default async function ResourceDetailPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) {
    redirect(`/login?callbackUrl=/publisher/resources/${params.id}`);
  }
  const actor = { id: session.user.id, role: session.user.role };

  let resource;
  try {
    resource = await getResourceForActor(actor, params.id);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    if (error instanceof ForbiddenError) redirect("/publisher/resources");
    throw error;
  }

  const [domains, universities, analytics, myFavorite] = await Promise.all([
    listDomainsWithSpecialties(),
    listUniversitiesWithFaculties(),
    getResourceAnalyticsSummary(actor, resource.id),
    prisma.favorite.findUnique({
      where: { userId_resourceId: { userId: actor.id, resourceId: resource.id } },
    }),
  ]);

  const isOwner = resource.uploadedById === actor.id;
  const canEdit =
    (isOwner && actor.role === "PUBLISHER" && ["DRAFT", "CHANGES_REQUESTED"].includes(resource.status)) ||
    actor.role === "ADMIN" ||
    actor.role === "SUPER_ADMIN";

  const canSubmit =
    (isOwner || actor.role === "ADMIN" || actor.role === "SUPER_ADMIN") &&
    ["DRAFT", "CHANGES_REQUESTED"].includes(resource.status);

  const canDelete = isOwner && actor.role === "PUBLISHER" && resource.status === "DRAFT";

  const boundUpdateAction = updateResourceAction.bind(null, resource.id);

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-globanic-navy">{resource.title}</h1>
          <p className="text-sm text-gray-500">
            /resources/{resource.type.toLowerCase()}/{resource.slug}
          </p>
        </div>
        <ResourceStatusBadge status={resource.status} />
      </div>

      {resource.rejectionReason &&
        (resource.status === "REJECTED" || resource.status === "CHANGES_REQUESTED") && (
          <div className="mb-6 rounded-lg bg-orange-50 p-4 text-sm text-orange-800">
            <p className="mb-1 font-semibold">
              {resource.status === "REJECTED" ? "سبب الرفض:" : "التعديلات المطلوبة:"}
            </p>
            <p>{resource.rejectionReason}</p>
          </div>
        )}

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="مشاهدات" value={analytics.viewsCount} hint={`${analytics.rawViews} خام`} />
        <StatCard label="تحميلات" value={analytics.downloadsCount} hint={`${analytics.rawDownloads} خام`} />
        <StatCard label="محفوظات" value={analytics.bookmarksCount} />
        <div className="flex items-center">
          {!isOwner && (
            <BookmarkToggleButton resourceId={resource.id} initiallyBookmarked={!!myFavorite} />
          )}
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        {canSubmit && <SubmitForReviewButton resourceId={resource.id} />}
        {canDelete && <DeleteDraftButton resourceId={resource.id} redirectTo="/publisher/resources" />}
      </div>

      <div className="mb-8 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">صورة الغلاف</h2>
        {canEdit ? (
          <ResourceCoverUploadForm resourceId={resource.id} hasCover={!!resource.coverImageKey} />
        ) : resource.coverImageKey ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/resources/${resource.id}/cover`}
            alt="صورة الغلاف"
            className="h-40 w-32 rounded-lg border border-gray-100 object-cover"
          />
        ) : (
          <p className="text-sm text-gray-500">لا توجد صورة غلاف.</p>
        )}
      </div>

      <div className="mb-8 rounded-2xl border border-gray-100 p-5">
        <h2 className="mb-3 text-sm font-semibold text-gray-700">سجل الإصدارات (Versions)</h2>

        {resource.versions.length === 0 ? (
          <p className="mb-4 text-sm text-gray-500">لا يوجد ملف مرفوع بعد لهذا المورد.</p>
        ) : (
          <ul className="mb-4 space-y-2 text-sm">
            {resource.versions.map((v) => (
              <li
                key={v.id}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-50 pb-2"
              >
                <div>
                  <span className="font-medium">النسخة {v.versionNumber}</span>
                  {v.changeNote && <span className="text-gray-500"> — {v.changeNote}</span>}
                  {v.file && (
                    <span className="ml-2 text-xs text-gray-400">
                      ({(v.file.fileSize / (1024 * 1024)).toFixed(1)}MB)
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-gray-500">
                    {new Intl.DateTimeFormat("fr-FR").format(v.createdAt)}
                  </span>
                  {v.file && (
                    <a
                      href={`/api/resources/${resource.id}/file?version=${v.versionNumber}`}
                      className="font-semibold text-globanic-blue hover:underline"
                    >
                      تنزيل
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        {canEdit && <ResourceDocumentUploadForm resourceId={resource.id} />}
      </div>

      {canEdit ? (
        <ResourceForm
          action={boundUpdateAction}
          domains={domains}
          universities={universities}
          submitLabel="حفظ التعديلات"
          lockType
          defaults={{
            title: resource.title,
            type: resource.type,
            abstract: resource.abstract ?? undefined,
            description: resource.description ?? undefined,
            keywords: resource.keywords,
            domainId: resource.domainId ?? undefined,
            specialtyId: resource.specialtyId ?? undefined,
            universityId: resource.universityId ?? undefined,
            facultyId: resource.facultyId ?? undefined,
            level: resource.level ?? undefined,
            year: resource.year,
            language: resource.language ?? undefined,
            authorName: resource.authors[0]?.author.fullName ?? "",
          }}
        />
      ) : (
        <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-600">
          لا يمكن تعديل هذا المورد في حالته الحالية ({resource.status}).
        </div>
      )}
    </main>
  );
}
