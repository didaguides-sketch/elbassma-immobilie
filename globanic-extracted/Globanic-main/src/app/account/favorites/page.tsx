import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/server/auth/auth";
import { listFavoriteResources } from "@/server/services/analytics-tracking.service";
import { ResourceCard } from "@/components/resources/ResourceCard";
import { BookmarkToggleButton } from "@/components/analytics/BookmarkToggleButton";
import { ResourceListPagination } from "@/components/resources/ResourceListPagination";
import { parsePage } from "@/lib/utils/pagination";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary(await getLocale());
  return { title: dict.account.savedResourcesHeading };
}

const PAGE_SIZE = 12;

export default async function FavoritesPage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  const locale = await getLocale();
  const dict = await getDictionary(locale);

  const session = await auth();
  const actor = { id: session!.user.id };

  const page = parsePage(searchParams.page);
  const { favorites, hasMore } = await listFavoriteResources(actor, {
    take: PAGE_SIZE,
    skip: (page - 1) * PAGE_SIZE,
  });

  return (
    <main className="container-page py-10">
      <h1 className="mb-6 font-serif text-h1 font-semibold text-globanic-navy">
        {dict.account.savedResourcesHeading}
      </h1>

      {favorites.length === 0 ? (
        <div className="rounded border border-dashed border-slate-200 bg-white p-12 text-center">
          <p className="mb-4 text-body text-slate-500">{dict.account.noFavoritesMessage}</p>
          <Link
            href="/search"
            className="inline-block rounded bg-globanic-navy px-4 py-2 text-body-sm font-semibold text-white hover:bg-globanic-navyDeep"
          >
            {dict.account.searchToSaveCta}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {favorites.map((resource) => (
            <div key={resource.id} className="space-y-2">
              <ResourceCard resource={resource} />
              <BookmarkToggleButton
                resourceId={resource.id}
                initiallyBookmarked
                returnTo="/account/favorites"
              />
            </div>
          ))}
        </div>
      )}

      <ResourceListPagination page={page} hasMore={hasMore} />
    </main>
  );
}
