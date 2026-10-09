import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/server/auth/auth";
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
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { formatDate } from "@/lib/i18n/format";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary(await getLocale());
  return { title: dict.publisherDashboard.editResourcePageTitle };
}

export default async function ResourceDetailPage({ params }: { params: { id: string } }) {
  const locale = await getLocale();
  const dict = await getDictionary(locale);
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
    <main className="container-page py-10">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-serif text-h1 font-semibold text-globanic-navy">{resource.title}</h1>
            <p className="text-body-sm text-slate-500">
              /resources/{resource.type.toLowerCase()}/{resource.slug}
            </p>
          </div>
          <ResourceStatusBadge status={resource.status} />
        </div>

        {resource.rejectionReason &&
          (resource.status === "REJECTED" || resource.status === "CHANGES_REQUESTED") && (
            <div className="mb-6 rounded border border-orange-200 bg-orange-50 p-4 text-body-sm text-orange-800">
              <p className="mb-1 font-semibold">
                {resource.status === "REJECTED"
                  ? dict.publisherDashboard.rejectionReasonLabel
                  : dict.publisherDashboard.changesRequestedLabel}
              </p>
              <p>{resource.rejectionReason}</p>
            </div>
          )}

        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            label={dict.publisherDashboard.viewsStatLabel}
            value={analytics.viewsCount}
            hint={dict.publisherDashboard.rawCountHint.replace("{count}", String(analytics.rawViews))}
          />
          <StatCard
            label={dict.publisherDashboard.downloadsStatLabel}
            value={analytics.downloadsCount}
            hint={dict.publisherDashboard.rawCountHint.replace("{count}", String(analytics.rawDownloads))}
          />
          <StatCard label={dict.publisherDashboard.bookmarksStatLabel} value={analytics.bookmarksCount} />
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
          <h2 className="text-body-sm font-semibold text-slate-700">{dict.publisherDashboard.coverImageHeading}</h2>
          {canEdit ? (
            <ResourceCoverUploadForm resourceId={resource.id} hasCover={!!resource.coverImageKey} />
          ) : resource.coverImageKey ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/resources/${resource.id}/cover`}
              alt={dict.publisherDashboard.coverImageAlt}
              className="h-40 w-32 rounded border border-slate-200 object-cover"
            />
          ) : (
            <p className="text-body-sm text-slate-500">{dict.publisherDashboard.noCoverImageMessage}</p>
          )}
        </div>

        <div className="mb-8 rounded border border-slate-200 p-5">
          <h2 className="mb-3 text-body-sm font-semibold text-slate-700">{dict.publisherDashboard.versionsHeading}</h2>

          {resource.versions.length === 0 ? (
            <p className="mb-4 text-body-sm text-slate-500">{dict.publisherDashboard.noFileUploadedMessage}</p>
          ) : (
            <ul className="mb-4 space-y-2 text-body-sm">
              {resource.versions.map((v) => (
                <li
                  key={v.id}
                  className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2"
                >
                  <div>
                    <span className="font-medium">
                      {dict.publisherDashboard.versionLabel.replace("{number}", String(v.versionNumber))}
                    </span>
                    {v.changeNote && <span className="text-slate-500"> — {v.changeNote}</span>}
                    {v.file && (
                      <span className="ms-2 text-caption text-slate-400">
                        ({(v.file.fileSize / (1024 * 1024)).toFixed(1)}MB)
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-500">{formatDate(v.createdAt, locale)}</span>
                    {v.file && (
                      <a
                        href={`/api/resources/${resource.id}/file?version=${v.versionNumber}`}
                        className="font-semibold text-globanic-blue hover:underline"
                      >
                        {dict.publisherDashboard.downloadLink}
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
            submitLabel={dict.publisherDashboard.updateSubmitLabel}
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
          <div className="rounded border border-slate-200 bg-slate-50 p-4 text-body-sm text-slate-600">
            {dict.publisherDashboard.cannotEditMessage.replace("{status}", resource.status)}
          </div>
        )}
      </div>
    </main>
  );
}
