import type { Metadata } from "next";
import { auth } from "@/server/auth/auth.config";
import { listFavoriteResources } from "@/server/services/analytics-tracking.service";
import { ResourceCard } from "@/components/resources/ResourceCard";
import { ResourceListPagination } from "@/components/resources/ResourceListPagination";
import { parsePage } from "@/lib/utils/pagination";

export const metadata: Metadata = { title: "الموارد المحفوظة" };

const PAGE_SIZE = 12;

export default async function FavoritesPage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  const session = await auth();
  const actor = { id: session!.user.id };

  const page = parsePage(searchParams.page);
  const { favorites, hasMore } = await listFavoriteResources(actor, {
    take: PAGE_SIZE,
    skip: (page - 1) * PAGE_SIZE,
  });

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold text-globanic-navy">الموارد المحفوظة</h1>

      {favorites.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-12 text-center text-gray-500">
          لا توجد موارد محفوظة بعد.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {favorites.map((resource) => (
            <ResourceCard key={resource.id} resource={resource} />
          ))}
        </div>
      )}

      <ResourceListPagination page={page} hasMore={hasMore} />
    </main>
  );
}
