import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { PUBLIC_RESOURCE_CARD_SELECT } from "@/server/services/public-resource.service";
import type {
  SearchProvider,
  SearchQuery,
  SearchResult,
  SearchSort,
} from "./search.interface";

function buildOrderBy(sort: SearchSort, trimmedQuery: string): Prisma.Sql {
  switch (sort) {
    case "recent":
      return Prisma.sql`r."publishedAt" DESC NULLS LAST`;
    case "most_viewed":
      return Prisma.sql`r."viewsCount" DESC`;
    case "most_downloaded":
      return Prisma.sql`r."downloadsCount" DESC`;
    case "relevance":
    default:
      // ts_rank respects the A/B/C/D weighting baked into searchVector by
      // the migration (title > keywords > abstract > description).
      return Prisma.sql`ts_rank(r."searchVector", websearch_to_tsquery('french', ${trimmedQuery})) DESC, r."publishedAt" DESC`;
  }
}

/**
 * Real PostgreSQL Full-Text Search. `status = 'PUBLISHED'` is
 * unconditionally part of the WHERE clause — never optional, same
 * discipline as every other public read path in this app.
 *
 * Two-step design, deliberately: (1) this raw, fully-parameterized query
 * determines *which* resources match and in what order; (2) a plain
 * Prisma `findMany` with the already-proven `PUBLIC_RESOURCE_CARD_SELECT`
 * shape (same one `/resources`, `/universities/[slug]`, etc. all use)
 * fetches the actual nested data. Raw SQL only does what raw SQL is
 * needed for (tsvector matching + rank ordering); everything else reuses
 * the existing, tested query shape rather than hand-rolling nested JSON
 * aggregation in SQL that can't be verified against a real Postgres
 * instance in this environment.
 */
export class PostgresSearchProvider implements SearchProvider {
  async search(query: SearchQuery): Promise<SearchResult> {
    const trimmedQuery = query.q.trim();
    if (!trimmedQuery) {
      return { items: [], hasMore: false };
    }

    const { filters = {}, sort = "relevance", take = 20, skip = 0 } = query;
    const ilikePattern = `%${trimmedQuery}%`;
    const orderBy = buildOrderBy(sort, trimmedQuery);

    // Every filter fragment is either a fully-parameterized Prisma.sql
    // clause or Prisma.empty — never a string-concatenated value.
    const typeClause = filters.type
      ? Prisma.sql`AND r."type" = ${filters.type}::"ResourceType"`
      : Prisma.empty;
    const domainClause = filters.domainSlug
      ? Prisma.sql`AND d."slug" = ${filters.domainSlug}`
      : Prisma.empty;
    const universityClause = filters.universityId
      ? Prisma.sql`AND r."universityId" = ${filters.universityId}`
      : Prisma.empty;
    const languageClause = filters.language
      ? Prisma.sql`AND r."language" = ${filters.language}`
      : Prisma.empty;

    // Fetch one extra row to detect a next page, same fetch+1 pattern as
    // listPublishedResources (Phase 4/8) — no separate COUNT(*) query.
    const matches = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
      SELECT r."id"
      FROM "Resource" r
      LEFT JOIN "Domain" d ON d."id" = r."domainId"
      LEFT JOIN "ResourceAuthor" ra ON ra."resourceId" = r."id"
      LEFT JOIN "Author" a ON a."id" = ra."authorId"
      WHERE r."status" = 'PUBLISHED'
        AND (
          r."searchVector" @@ websearch_to_tsquery('french', ${trimmedQuery})
          OR a."fullName" ILIKE ${ilikePattern}
          OR EXISTS (
            SELECT 1 FROM "University" u
            WHERE u."id" = r."universityId" AND u."name" ILIKE ${ilikePattern}
          )
        )
        ${typeClause}
        ${domainClause}
        ${universityClause}
        ${languageClause}
      GROUP BY r."id"
      ORDER BY ${orderBy}
      LIMIT ${take + 1} OFFSET ${skip}
    `);

    const hasMore = matches.length > take;
    const pageMatches = hasMore ? matches.slice(0, take) : matches;
    const orderedIds = pageMatches.map((m) => m.id);

    if (orderedIds.length === 0) {
      return { items: [], hasMore: false };
    }

    const resources = await prisma.resource.findMany({
      where: { id: { in: orderedIds } },
      select: PUBLIC_RESOURCE_CARD_SELECT,
    });

    // `IN (...)` does not preserve order — re-sort to match the ranked
    // order the raw query already computed.
    const byId = new Map(resources.map((r) => [r.id, r]));
    const items = orderedIds
      .map((id) => byId.get(id))
      .filter((r): r is NonNullable<typeof r> => !!r);

    return { items, hasMore };
  }

  async index(): Promise<void> {
    // No-op: PostgreSQL's GENERATED column (see the Phase 10 migration)
    // maintains searchVector automatically on every INSERT/UPDATE.
  }

  async removeFromIndex(): Promise<void> {
    // No-op, same reason — and a resource that leaves PUBLISHED simply
    // stops matching future searches via the WHERE clause above; there is
    // no separate index to remove it from.
  }
}
