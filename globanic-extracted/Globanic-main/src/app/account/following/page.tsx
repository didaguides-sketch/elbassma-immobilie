import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/server/auth/auth";
import { listFollowedAuthors } from "@/server/services/follow.service";
import { FollowToggleButton } from "@/components/authors/FollowToggleButton";
import { ResourceListPagination } from "@/components/resources/ResourceListPagination";
import { parsePage } from "@/lib/utils/pagination";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary(await getLocale());
  return { title: dict.account.followingHeading };
}

const PAGE_SIZE = 24;

export default async function FollowingPage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  const locale = await getLocale();
  const dict = await getDictionary(locale);

  const session = await auth();
  const actor = { id: session!.user.id };

  const page = parsePage(searchParams.page);
  const { following, hasMore } = await listFollowedAuthors(actor, {
    take: PAGE_SIZE,
    skip: (page - 1) * PAGE_SIZE,
  });

  return (
    <main className="container-page py-10">
      <h1 className="mb-6 font-serif text-h1 font-semibold text-globanic-navy">
        {dict.account.followingHeading}
      </h1>

      {following.length === 0 ? (
        <div className="rounded border border-dashed border-slate-200 bg-white p-12 text-center">
          <p className="mb-4 text-body text-slate-500">{dict.account.noFollowingYetMessage}</p>
          <Link
            href="/authors"
            className="inline-block rounded bg-globanic-navy px-4 py-2 text-body-sm font-semibold text-white hover:bg-globanic-navyDeep"
          >
            {dict.author.browseCta}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {following.map((a) => (
            <div key={a.id} className="rounded border border-slate-200 bg-white p-4">
              <Link href={`/authors/${a.slug}`} className="block">
                <h3 className="mb-1 font-semibold text-globanic-navy">
                  {a.fullName}
                  {a.verified && <span className="ms-1 text-globanic-blue">✓</span>}
                </h3>
                {a.university && (
                  <p className="mb-2 text-caption text-slate-500">{a.university.name}</p>
                )}
                <p className="mb-3 text-caption text-slate-400">
                  {a.publishedResourceCount} {dict.common.publishedResourceCountSuffix}
                </p>
              </Link>
              <FollowToggleButton authorId={a.id} initiallyFollowing returnTo="/account/following" />
            </div>
          ))}
        </div>
      )}

      <ResourceListPagination page={page} hasMore={hasMore} />
    </main>
  );
}
