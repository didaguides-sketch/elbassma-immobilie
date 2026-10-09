import type { ResourceType } from "@prisma/client";
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
    return { items: [], hasMore: false, query: "" };
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
