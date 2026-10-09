import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@/server/auth/auth";
import {
  getAuthorBySlug,
  listPublishedResourcesByAuthor,
} from "@/server/services/public-directory.service";
import { isFollowingAuthor } from "@/server/services/follow.service";
import { ResourceCard } from "@/components/resources/ResourceCard";
import { ResourceListPagination } from "@/components/resources/ResourceListPagination";
import { FollowToggleButton } from "@/components/authors/FollowToggleButton";
import { parsePage } from "@/lib/utils/pagination";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { buildAuthorJsonLd } from "@/lib/seo/json-ld";
import { absoluteUrl } from "@/lib/utils/site-url";
import { JsonLd } from "@/components/seo/JsonLd";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";

const PAGE_SIZE = 20;

type PageParams = { slug: string };
type PageSearchParams = { page?: string };

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: PageParams;
  searchParams: PageSearchParams;
}): Promise<Metadata> {
  const author = await getAuthorBySlug(params.slug);
  const dict = await getDictionary(await getLocale());
  if (!author) return { title: dict.common.notFound };

  const description =
    author.bio?.slice(0, 300) ??
    `${author.fullName}${author.university ? ` — ${author.university.name}` : ""} — ${dict.author.metaDescriptionResourceCount.replace("{count}", String(author.publishedResourceCount))}`;

  return buildPageMetadata({
    title: author.fullName,
    description,
    path: `/authors/${params.slug}`,
    searchParams,
    allowedParams: ["page"],
  });
}

export default async function AuthorDetailPage({
  params,
  searchParams,
}: {
  params: PageParams;
  searchParams: PageSearchParams;
}) {
  const author = await getAuthorBySlug(params.slug);
  if (!author) notFound();

  const locale = await getLocale();
  const dict = await getDictionary(locale);

  const session = await auth();
  const actor = session?.user ? { id: session.user.id } : null;
  const following = await isFollowingAuthor(actor, author.id);

  const page = parsePage(searchParams.page);
  const { resources, hasMore } = await listPublishedResourcesByAuthor(author.id, {
    take: PAGE_SIZE,
    skip: (page - 1) * PAGE_SIZE,
  });

  return (
    <div className="container-page py-10">
      <JsonLd data={buildAuthorJsonLd(author, absoluteUrl(`/authors/${params.slug}`))} />

      <nav aria-label={dict.common.breadcrumbNav} className="mb-6 flex flex-wrap items-center gap-1 text-body-sm text-slate-500">
        <Link href="/" className="hover:text-globanic-blue">Globanic</Link>
        <span aria-hidden="true" className="text-slate-300">/</span>
        <Link href="/authors" className="hover:text-globanic-blue">{dict.nav.authors}</Link>
        <span aria-hidden="true" className="text-slate-300">/</span>
        <span>{author.fullName}</span>
      </nav>

      <div className="mb-6 flex items-center gap-4">
        {author.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={author.avatarUrl}
            alt={author.fullName}
            className="h-16 w-16 rounded-full border border-slate-200 object-cover"
          />
        ) : (
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-slate-100 text-h3 font-semibold text-globanic-navy">
            {author.fullName.charAt(0)}
          </span>
        )}
        <div>
          <h1 className="text-h2 font-semibold text-globanic-navy">
            {author.fullName}
            {author.verified && (
              <span aria-label={dict.search.verifiedLabel} title={dict.search.verifiedLabel} className="text-globanic-blue">
                {" "}✓
              </span>
            )}
          </h1>
          {author.university && (
            <Link href={`/universities/${author.university.slug}`} className="text-body-sm text-slate-500 hover:text-globanic-blue">
              {author.university.name}
            </Link>
          )}
        </div>
      </div>

      {author.bio && <p className="mb-6 max-w-2xl text-body text-slate-700">{author.bio}</p>}

      <div className="mb-8 flex items-center gap-4">
        <p className="text-body-sm text-slate-600">
          {author.publishedResourceCount} {dict.common.publishedResourceCountSuffix}
        </p>
        <FollowToggleButton
          authorId={author.id}
          initiallyFollowing={following}
          returnTo={`/authors/${author.slug}`}
        />
      </div>

      {resources.length === 0 ? (
        <div className="rounded border border-dashed border-slate-200 bg-slate-50 p-12 text-center text-body-sm text-slate-500">
          {dict.author.noResourcesForAuthor}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {resources.map((r) => (
            <ResourceCard key={r.id} resource={r} />
          ))}
        </div>
      )}

      <ResourceListPagination page={page} hasMore={hasMore} />
    </div>
  );
}
