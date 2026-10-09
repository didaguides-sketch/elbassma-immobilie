import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/server/auth/auth.config";
import { listFollowedAuthors } from "@/server/services/follow.service";
import { FollowToggleButton } from "@/components/authors/FollowToggleButton";
import { ResourceListPagination } from "@/components/resources/ResourceListPagination";
import { parsePage } from "@/lib/utils/pagination";

export const metadata: Metadata = { title: "الباحثون المتابَعون" };

const PAGE_SIZE = 24;

export default async function FollowingPage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  const session = await auth();
  const actor = { id: session!.user.id };

  const page = parsePage(searchParams.page);
  const { following, hasMore } = await listFollowedAuthors(actor, {
    take: PAGE_SIZE,
    skip: (page - 1) * PAGE_SIZE,
  });

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold text-globanic-navy">الباحثون المتابَعون</h1>

      {following.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-12 text-center text-gray-500">
          لا تتابع أي باحث حتى الآن.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {following.map((a) => (
            <div
              key={a.id}
              className="block rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition hover:shadow-md"
            >
              <Link href={`/authors/${a.slug}`} className="block">
                <h3 className="mb-1 font-semibold text-globanic-navy">
                  {a.fullName}
                  {a.verified && <span className="mr-1 text-globanic-blue">✓</span>}
                </h3>
                {a.university && <p className="mb-2 text-xs text-gray-500">{a.university.name}</p>}
                <p className="mb-3 text-xs text-gray-400">{a.publishedResourceCount} مورد منشور</p>
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
