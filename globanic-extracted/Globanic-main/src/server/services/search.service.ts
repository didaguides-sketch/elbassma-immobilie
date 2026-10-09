import type { ResourceType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSearchProvider } from "@/server/search";
import type { SearchSort } from "@/server/search/search.interface";

const VALID_SORTS: SearchSort[] = ["relevance", "recent", "most_viewed", "most_downloaded"];
const VALID_TYPES: ResourceType[] = ["COURS", "MEMOIRE", "ARTICLE", "THESE", "LIVRE"];

function parseSort(raw?: string): SearchSort {
  return VALID_SORTS.includes(raw as SearchSort) ? (raw as SearchSort) : "relevance";
}

function parseType(raw?: string): ResourceType | undefined {
  return VALID_TYPES.includes(raw as ResourceType) ? (raw as ResourceType) : undefined;
}

export async function searchResources(params: {
  q?: string;
  type?: string;
  domainSlug?: string;
  universityId?: string;
  language?: string;
  sort?: string;
  take?: number;
  skip?: number;
}) {
  const q = (params.q ?? "").trim();

  // No provider round-trip for an empty query — an empty search is a
  // prompt state, not a "browse everything" state (that's /resources).
  if (!q) {
    return { items: [], hasMore: false, total: undefined as number | undefined, query: "" };
  }

  const provider = await getSearchProvider();
  const result = await provider.search({
    q,
    filters: {
      type: parseType(params.type),
      domainSlug: params.domainSlug || undefined,
      universityId: params.universityId || undefined,
      language: params.language || undefined,
    },
    sort: parseSort(params.sort),
    take: params.take,
    skip: params.skip,
  });

  return { ...result, query: q };
}

/**
 * Real, DISTINCT language values actually present among published
 * resources — never a hardcoded ["ar","fr","en","es"] list, since
 * Resource.language is a free-text field (see schema.prisma) and a
 * hardcoded list could silently not match what's actually stored,
 * making the filter look broken. Small, cheap query — Resource rows
 * are not high-cardinality enough for this to need caching.
 */
export async function getAvailableSearchLanguages(): Promise<string[]> {
  const rows = await prisma.resource.findMany({
    where: { status: "PUBLISHED", language: { not: null } },
    distinct: ["language"],
    select: { language: true },
    orderBy: { language: "asc" },
  });
  return rows.map((r) => r.language).filter((l): l is string => !!l && l.trim().length > 0);
}
