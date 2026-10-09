import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@/server/auth/auth.config";
import { prisma } from "@/lib/prisma";
import { getPublishedResourceBySlug } from "@/server/services/public-resource.service";
import { urlSegmentToResourceType, resourceTypeToUrlSegment } from "@/lib/utils/resource-type";
import { absoluteUrl } from "@/lib/utils/site-url";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { buildResourceJsonLd } from "@/lib/seo/json-ld";
import { JsonLd } from "@/components/seo/JsonLd";
import { StatCard } from "@/components/analytics/StatCard";
import { BookmarkToggleButton } from "@/components/analytics/BookmarkToggleButton";
import { ResourceViewTracker } from "@/components/resources/ResourceViewTracker";
import { ReportResourceForm } from "@/components/reports/ReportResourceForm";

const TYPE_LABELS: Record<string, string> = {
  COURS: "Cours",
  MEMOIRE: "Mémoire",
  ARTICLE: "Article",
  THESE: "Thèse",
  LIVRE: "Livre",
};

type PageParams = { type: string; slug: string };

async function loadResource(params: PageParams) {
  const type = urlSegmentToResourceType(params.type);
  if (!type) return null;
  // getPublishedResourceBySlug only ever returns status = PUBLISHED —
  // any other status (including "doesn't exist") is treated identically
  // as not-found, so nothing about a draft/under-review resource ever
  // leaks through this path.
  return getPublishedResourceBySlug(type, params.slug);
}

export async function generateMetadata({ params }: { params: PageParams }): Promise<Metadata> {
  const resource = await loadResource(params);
  if (!resource) return { title: "Ressource introuvable" };

  const description =
    resource.abstract?.slice(0, 300) ?? resource.description?.slice(0, 300) ?? `${TYPE_LABELS[resource.type]} — ${resource.title}`;

  return buildPageMetadata({
    title: resource.title,
    description,
    path: `/resources/${resourceTypeToUrlSegment(resource.type)}/${resource.slug}`,
  });
}

export default async function PublicResourcePage({ params }: { params: PageParams }) {
  const resource = await loadResource(params);
  if (!resource) notFound();

  const session = await auth();
  const myFavorite = session?.user
    ? await prisma.favorite.findUnique({
        where: { userId_resourceId: { userId: session.user.id, resourceId: resource.id } },
      })
    : null;

  const latestVersion = resource.versions[0];
  const typeSegment = resourceTypeToUrlSegment(resource.type);
  const canonicalUrl = `/resources/${typeSegment}/${resource.slug}`;

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <JsonLd data={buildResourceJsonLd(resource, absoluteUrl(canonicalUrl))} />

      {/* Fires the one legitimate "view" event for this resource - see
          recordViewAction / recordResourceView for the eligibility rules. */}
      <ResourceViewTracker resourceId={resource.id} />

      <nav className="mb-4 text-sm text-gray-500">
        <a href="/" className="hover:text-globanic-blue">
          Globanic
        </a>{" "}
        /{" "}
        <a href={`/resources/${typeSegment}`} className="hover:text-globanic-blue">
          {TYPE_LABELS[resource.type]}
        </a>
      </nav>

      <div className="mb-6 flex flex-col gap-6 sm:flex-row">
        {resource.coverImageKey && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/resources/${resource.id}/cover`}
            alt={resource.title}
            className="h-56 w-40 flex-shrink-0 rounded-xl border border-gray-100 object-cover"
          />
        )}

        <div className="flex-1">
          <span className="mb-2 inline-block rounded-full bg-globanic-blue/10 px-3 py-1 text-xs font-semibold text-globanic-blue">
            {TYPE_LABELS[resource.type]}
          </span>
          <h1 className="mb-2 text-2xl font-bold text-globanic-navy">{resource.title}</h1>

          <p className="mb-3 text-sm text-gray-600">
            {resource.authors.map((a) => a.author.fullName).join(", ")}
            {resource.university && ` · ${resource.university.name}`}
            {resource.faculty && ` · ${resource.faculty.name}`}
          </p>

          <p className="mb-4 text-xs text-gray-500">
            {resource.domain && <span>{resource.domain.name}</span>}
            {resource.specialty && <span> · {resource.specialty.name}</span>}
            {resource.level && <span> · {resource.level}</span>}
            {resource.year && <span> · {resource.year}</span>}
            {resource.language && <span> · {resource.language}</span>}
          </p>

          <div className="flex flex-wrap items-center gap-3">
            {latestVersion?.file && (
              <a
                href={`/api/resources/${resource.id}/file`}
                className="rounded-lg bg-globanic-blue px-5 py-2.5 text-sm font-semibold text-white hover:bg-globanic-blueLight"
              >
                Télécharger
              </a>
            )}
            <BookmarkToggleButton
              resourceId={resource.id}
              initiallyBookmarked={!!myFavorite}
              returnTo={`/resources/${typeSegment}/${resource.slug}`}
            />
          </div>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-3">
        <StatCard label="Vues" value={resource.viewsCount} />
        <StatCard label="Téléchargements" value={resource.downloadsCount} />
        <StatCard label="Enregistrements" value={resource.bookmarksCount} />
      </div>

      {resource.abstract && (
        <section className="mb-6">
          <h2 className="mb-2 text-sm font-semibold text-gray-700">Résumé</h2>
          <p className="text-gray-700">{resource.abstract}</p>
        </section>
      )}

      {resource.description && (
        <section className="mb-6">
          <h2 className="mb-2 text-sm font-semibold text-gray-700">Description</h2>
          <p className="whitespace-pre-line text-gray-700">{resource.description}</p>
        </section>
      )}

      {resource.keywords.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 text-sm font-semibold text-gray-700">Mots-clés</h2>
          <div className="flex flex-wrap gap-2">
            {resource.keywords.map((kw) => (
              <span key={kw} className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">
                {kw}
              </span>
            ))}
          </div>
        </section>
      )}

      <section className="border-t border-gray-100 pt-4">
        <ReportResourceForm resourceId={resource.id} returnTo={canonicalUrl} />
      </section>
    </main>
  );
}
