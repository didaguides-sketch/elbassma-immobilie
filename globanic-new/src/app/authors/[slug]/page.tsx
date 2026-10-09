import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@/server/auth/auth.config";
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
  if (!author) return { title: "غير موجود" };

  const description =
    author.bio?.slice(0, 300) ??
    `${author.fullName}${author.university ? ` — ${author.university.name}` : ""} — ${author.publishedResourceCount} مورد منشور على Globanic.`;

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

  const session = await auth();
  const actor = session?.user ? { id: session.user.id } : null;
  const following = await isFollowingAuthor(actor, author.id);

  const page = parsePage(searchParams.page);
  const { resources, hasMore } = await listPublishedResourcesByAuthor(author.id, {
    take: PAGE_SIZE,
    skip: (page - 1) * PAGE_SIZE,
  });

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <JsonLd data={buildAuthorJsonLd(author, absoluteUrl(`/authors/${params.slug}`))} />

      <div className="mb-6 flex items-center gap-4">
        {author.avatarUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={author.avatarUrl}
            alt={author.fullName}
            className="h-16 w-16 rounded-full border border-gray-100 object-cover"
          />
        )}
        <div>
          <h1 className="text-2xl font-bold text-globanic-navy">
            {author.fullName}
            {author.verified && <span className="mr-2 text-globanic-blue">✓</span>}
          </h1>
          {author.university && <p className="text-sm text-gray-500">{author.university.name}</p>}
        </div>
      </div>

      {author.bio && <p className="mb-6 text-gray-700">{author.bio}</p>}

      <div className="mb-6 flex items-center gap-4">
        <p className="text-sm text-gray-600">{author.publishedResourceCount} مورد منشور</p>
        <FollowToggleButton
          authorId={author.id}
          initiallyFollowing={following}
          returnTo={`/authors/${author.slug}`}
        />
      </div>

      {resources.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-12 text-center text-gray-500">
          لا توجد موارد منشورة لهذا الباحث حاليًا.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {resources.map((r) => (
            <ResourceCard key={r.id} resource={r} />
          ))}
        </div>
      )}

      <ResourceListPagination page={page} hasMore={hasMore} />
    </main>
  );
}
