import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/server/auth/auth";
import { prisma } from "@/lib/prisma";
import { getPublishedResourceBySlug, listRelatedResources, listRelatedArticles } from "@/server/services/public-resource.service";
import { urlSegmentToResourceType, resourceTypeToUrlSegment } from "@/lib/utils/resource-type";
import { absoluteUrl } from "@/lib/utils/site-url";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { buildResourceJsonLd, buildArticleJsonLd } from "@/lib/seo/json-ld";
import { JsonLd } from "@/components/seo/JsonLd";
import { StatCard } from "@/components/analytics/StatCard";
import { BookmarkToggleButton } from "@/components/analytics/BookmarkToggleButton";
import { ShareResourceButton } from "@/components/resources/ShareResourceButton";
import { ResourceViewTracker } from "@/components/resources/ResourceViewTracker";
import { ReportResourceForm } from "@/components/reports/ReportResourceForm";
import { ResourceCard } from "@/components/resources/ResourceCard";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary, type Dictionary } from "@/lib/i18n/get-dictionary";
import { formatDate as formatDateForLocale } from "@/lib/i18n/format";

/** Real fields only (ResourceFile.fileSize / .mimeType) — no page count, since that field doesn't exist on the schema. */
function formatFileSize(bytes: number, dict: Dictionary): string {
  if (bytes < 1024) return dict.resource.byteUnit.replace("{value}", String(bytes));
  const kb = bytes / 1024;
  if (kb < 1024) return dict.resource.kbUnit.replace("{value}", kb.toFixed(0));
  const mb = kb / 1024;
  return dict.resource.mbUnit.replace("{value}", mb.toFixed(1));
}

const MIME_LABELS: Record<string, string> = {
  "application/pdf": "PDF",
  "application/msword": "Word",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "Word",
  "application/vnd.ms-powerpoint": "PowerPoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "PowerPoint",
};

type PageParams = { type: string; slug: string };

async function loadResource(params: PageParams) {
  const type = urlSegmentToResourceType(params.type);
  if (!type) return null;
  // getPublishedResourceBySlug only ever returns status = PUBLISHED — any
  // other status (including "doesn't exist") is treated identically as
  // not-found, so nothing about a draft/under-review resource ever leaks
  // through this path. Unchanged from before this phase.
  return getPublishedResourceBySlug(type, params.slug);
}

export async function generateMetadata({ params }: { params: PageParams }): Promise<Metadata> {
  const resource = await loadResource(params);
  const dict = await getDictionary(await getLocale());
  if (!resource) return { title: dict.resource.notFoundTitle };

  const description =
    resource.abstract?.slice(0, 300) ?? resource.description?.slice(0, 300) ?? `${dict.resourceType[resource.type]} — ${resource.title}`;

  return buildPageMetadata({
    title: resource.title,
    description,
    path: `/resources/${resourceTypeToUrlSegment(resource.type)}/${resource.slug}`,
  });
}

export default async function PublicResourcePage({ params }: { params: PageParams }) {
  const resource = await loadResource(params);
  if (!resource) notFound();

  const locale = await getLocale();
  const dict = await getDictionary(locale);

  const isArticle = resource.type === "ARTICLE";
  const authorIds = resource.authors.map((a) => a.author.id);

  const [session, related] = await Promise.all([
    auth(),
    isArticle
      ? listRelatedArticles(
          { id: resource.id, domainId: resource.domainId, specialtyId: resource.specialtyId, universityId: resource.universityId },
          authorIds,
        )
      : listRelatedResources(
          { id: resource.id, domainId: resource.domainId, specialtyId: resource.specialtyId, universityId: resource.universityId },
          { authorIds },
        ),
  ]);

  const myFavorite = session?.user
    ? await prisma.favorite.findUnique({
        where: { userId_resourceId: { userId: session.user.id, resourceId: resource.id } },
      })
    : null;

  const latestVersion = resource.versions[0];
  const typeSegment = resourceTypeToUrlSegment(resource.type);
  const canonicalUrl = `/resources/${typeSegment}/${resource.slug}`;
  const publisherName = resource.uploadedBy.profile?.fullName;

  // Real academic breadcrumb — only relationships that actually exist on
  // this resource are shown. Faculty now links to a real Phase 6 route
  // (/faculties/[id]); Department/Module still don't exist anywhere in
  // the schema, so nothing for those is ever shown, linked, or implied.
  const breadcrumb: { label: string; href?: string }[] = [{ label: "Globanic", href: "/" }];
  if (resource.university) breadcrumb.push({ label: resource.university.name, href: `/universities/${resource.university.slug}` });
  if (resource.faculty) breadcrumb.push({ label: resource.faculty.name, href: `/faculties/${resource.faculty.id}` });
  if (resource.domain) breadcrumb.push({ label: resource.domain.name, href: `/domains/${resource.domain.slug}` });

  return (
    <div className="container-page py-10">
      <JsonLd data={isArticle ? buildArticleJsonLd(resource, absoluteUrl(canonicalUrl)) : buildResourceJsonLd(resource, absoluteUrl(canonicalUrl))} />
      <ResourceViewTracker resourceId={resource.id} />

      <nav aria-label={dict.common.breadcrumbNav} className="mb-6 flex flex-wrap items-center gap-1 text-body-sm text-slate-500">
        {breadcrumb.map((item, i) => (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && (
              <span aria-hidden="true" className="text-slate-300">
                /
              </span>
            )}
            {item.href ? (
              <Link href={item.href} className="hover:text-globanic-blue">
                {item.label}
              </Link>
            ) : (
              <span>{item.label}</span>
            )}
          </span>
        ))}
      </nav>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
        {/* ---------- MAIN COLUMN ---------- */}
        <div className="lg:col-span-2">
          <span className="mb-3 inline-block rounded bg-globanic-blue/10 px-2.5 py-1 text-caption font-semibold text-globanic-blue">
            {dict.resourceType[resource.type]}
          </span>

          <h1 className={`mb-3 font-semibold text-globanic-navy ${isArticle ? "font-serif text-h1" : "text-h2"}`}>
            {resource.title}
          </h1>

          <div className="mb-6 flex flex-wrap items-center gap-x-2 gap-y-1 text-body-sm text-slate-500">
            {resource.authors.length > 0 && (
              <span>
                {resource.authors.map((a, i) => (
                  <span key={a.author.id}>
                    {i > 0 && dict.common.listSeparator}
                    <Link href={`/authors/${a.author.slug}`} className="hover:text-globanic-blue">
                      {a.author.fullName}
                    </Link>
                    {a.author.verified && (
                      <span aria-label={dict.search.verifiedLabel} title={dict.search.verifiedLabel} className="text-globanic-blue">
                        {" "}✓
                      </span>
                    )}
                  </span>
                ))}
              </span>
            )}
            {resource.publishedAt && (
              <span>
                ·{" "}
                {dict.resource.publishedOn.replace(
                  "{date}",
                  formatDateForLocale(resource.publishedAt, locale, { year: "numeric", month: "long", day: "numeric" }),
                )}
              </span>
            )}
            {resource.language && <span>· {resource.language}</span>}
          </div>

          {resource.coverImageKey && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/resources/${resource.id}/cover`}
              alt={resource.title}
              className="mb-6 h-56 w-full rounded border border-slate-200 object-cover sm:h-72"
            />
          )}

          {/* ---------- PRIMARY ACTIONS ---------- */}
          <div className="mb-8 flex flex-wrap items-center gap-3">
            {latestVersion?.file && (
              <a
                href={`/api/resources/${resource.id}/file`}
                className="rounded bg-globanic-navy px-6 py-2.5 text-body-sm font-semibold text-white hover:bg-globanic-navyDeep"
              >
                {isArticle ? dict.resource.readArticle : dict.resource.downloadFile}
              </a>
            )}
            <BookmarkToggleButton
              resourceId={resource.id}
              initiallyBookmarked={!!myFavorite}
              returnTo={canonicalUrl}
            />
            <ShareResourceButton url={absoluteUrl(canonicalUrl)} title={resource.title} />
          </div>

          {resource.abstract && (
            <section className="mb-6">
              <h2 className="mb-2 text-h4 font-semibold text-globanic-navy">{dict.resource.abstractHeading}</h2>
              <p className={`text-slate-700 ${isArticle ? "font-serif text-body-lg leading-relaxed" : "text-body"}`}>
                {resource.abstract}
              </p>
            </section>
          )}

          {resource.description && (
            <section className="mb-6">
              <h2 className="mb-2 text-h4 font-semibold text-globanic-navy">{dict.resource.descriptionHeading}</h2>
              <p className={`whitespace-pre-line text-slate-700 ${isArticle ? "font-serif text-body-lg leading-relaxed" : "text-body"}`}>
                {resource.description}
              </p>
            </section>
          )}

          {resource.keywords.length > 0 && (
            <section className="mb-6">
              <h2 className="mb-2 text-h4 font-semibold text-globanic-navy">{dict.resource.keywordsHeading}</h2>
              <div className="flex flex-wrap gap-2">
                {resource.keywords.map((kw) => (
                  <span key={kw} className="rounded bg-slate-100 px-2.5 py-1 text-caption text-slate-600">
                    {kw}
                  </span>
                ))}
              </div>
            </section>
          )}

          <section className="border-t border-slate-100 pt-4">
            <ReportResourceForm resourceId={resource.id} returnTo={canonicalUrl} />
          </section>
        </div>

        {/* ---------- SIDEBAR ---------- */}
        <aside className="space-y-8">
          <div className="grid grid-cols-3 gap-3">
            <StatCard label={dict.common.viewsSuffix} value={resource.viewsCount} />
            <StatCard label={dict.common.downloadsSuffix} value={resource.downloadsCount} />
            <StatCard label={dict.resource.bookmarksLabel} value={resource.bookmarksCount} />
          </div>

          {publisherName && (
            <div>
              <h2 className="mb-2 text-caption font-semibold uppercase tracking-wide text-slate-400">{dict.resource.publisherHeading}</h2>
              <Link href={`/publishers/${resource.uploadedBy.id}`} className="text-body-sm font-medium text-globanic-navy hover:text-globanic-blue">
                {publisherName}
              </Link>
            </div>
          )}

          {(resource.university || resource.faculty || resource.domain || resource.specialty) && (
            <div>
              <h2 className="mb-2 text-caption font-semibold uppercase tracking-wide text-slate-400">{dict.resource.academicContextHeading}</h2>
              <dl className="space-y-1.5 text-body-sm">
                {resource.university && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500">{dict.search.universityLabel}</dt>
                    <dd>
                      <Link href={`/universities/${resource.university.slug}`} className="font-medium text-globanic-navy hover:text-globanic-blue">
                        {resource.university.name}
                      </Link>
                    </dd>
                  </div>
                )}
                {resource.faculty && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500">{dict.resource.facultyLabel}</dt>
                    <dd>
                      <Link href={`/faculties/${resource.faculty.id}`} className="font-medium text-globanic-navy hover:text-globanic-blue">
                        {resource.faculty.name}
                      </Link>
                    </dd>
                  </div>
                )}
                {resource.domain && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500">{dict.resource.domainLabel}</dt>
                    <dd>
                      <Link href={`/domains/${resource.domain.slug}`} className="font-medium text-globanic-navy hover:text-globanic-blue">
                        {resource.domain.name}
                      </Link>
                    </dd>
                  </div>
                )}
                {resource.specialty && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500">{dict.resource.specialtyLabel}</dt>
                    <dd className="font-medium text-globanic-navy">
                      {resource.domain ? (
                        <Link
                          href={`/domains/${resource.domain.slug}?specialty=${resource.specialty.slug}`}
                          className="hover:text-globanic-blue"
                        >
                          {resource.specialty.name}
                        </Link>
                      ) : (
                        resource.specialty.name
                      )}
                    </dd>
                  </div>
                )}
                {resource.level && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500">{dict.resource.levelLabel}</dt>
                    <dd className="font-medium text-globanic-navy">{resource.level}</dd>
                  </div>
                )}
                {resource.year && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500">{dict.resource.yearLabel}</dt>
                    <dd className="font-medium text-globanic-navy">{resource.year}</dd>
                  </div>
                )}
              </dl>
            </div>
          )}

          {latestVersion?.file && (
            <div>
              <h2 className="mb-2 text-caption font-semibold uppercase tracking-wide text-slate-400">{dict.resource.fileInfoHeading}</h2>
              <dl className="space-y-1.5 text-body-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">{dict.resource.formatLabel}</dt>
                  <dd className="font-medium text-globanic-navy">{MIME_LABELS[latestVersion.file.mimeType] ?? latestVersion.file.mimeType}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">{dict.resource.sizeLabel}</dt>
                  <dd className="font-medium text-globanic-navy">{formatFileSize(latestVersion.file.fileSize, dict)}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">{dict.resource.lastUpdatedLabel}</dt>
                  <dd className="font-medium text-globanic-navy">
                    {formatDateForLocale(resource.updatedAt, locale, { year: "numeric", month: "long", day: "numeric" })}
                  </dd>
                </div>
              </dl>
            </div>
          )}
        </aside>
      </div>

      {/* ---------- RELATED CONTENT ---------- */}
      {related.length > 0 && (
        <section className="mt-14 border-t border-slate-100 pt-10">
          <h2 className={`mb-5 text-h4 font-semibold text-globanic-navy ${isArticle ? "font-serif" : ""}`}>
            {isArticle ? dict.resource.relatedArticlesHeading : dict.resource.relatedResourcesHeading}
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((r) => (
              <ResourceCard key={r.id} resource={r} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
