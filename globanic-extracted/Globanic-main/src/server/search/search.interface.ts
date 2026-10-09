import type { ResourceType } from "@prisma/client";

export type SearchSort = "relevance" | "recent" | "most_viewed" | "most_downloaded";

export interface SearchFilters {
  type?: ResourceType;
  domainSlug?: string;
  universityId?: string;
  language?: string;
}

export interface SearchQuery {
  q: string;
  filters?: SearchFilters;
  sort?: SearchSort;
  take?: number;
  skip?: number;
}

export interface SearchResultItem {
  id: string;
  title: string;
  slug: string;
  type: ResourceType;
  level: string | null;
  year: number | null;
  viewsCount: number;
  downloadsCount: number;
  university: { name: string; slug: string } | null;
  authors: { author: { fullName: string; slug: string } }[];
}

export interface SearchResult {
  items: SearchResultItem[];
  hasMore: boolean;
  /**
   * A real COUNT(*) against the same WHERE clause that produced `items`
   * — never estimated, never omitted-then-guessed. Optional so a future
   * provider (e.g. an external search engine) that genuinely cannot
   * produce a cheap exact count isn't forced to fake one; callers must
   * treat `undefined` as "no trustworthy count available" and render
   * accordingly (see search.service.ts / the /search page), never as 0.
   */
  total?: number;
}

/**
 * Provider-agnostic search contract — same pattern as StorageProvider
 * (src/server/storage/storage.interface.ts). `search.service.ts` only
 * ever talks to this interface; swapping PostgresSearchProvider for a
 * future MeilisearchProvider/ElasticsearchProvider means adding one new
 * file here and flipping SEARCH_PROVIDER, not touching the page or
 * service call sites.
 *
 * `index`/`removeFromIndex` are part of the contract now for that same
 * forward-compatibility reason, even though PostgresSearchProvider's
 * implementation of them is a deliberate no-op: PostgreSQL's GENERATED
 * column maintains `searchVector` automatically on every INSERT/UPDATE,
 * so there is nothing for this provider to "index" explicitly. An
 * external search engine provider would implement these for real.
 */
export interface SearchProvider {
  search(query: SearchQuery): Promise<SearchResult>;
  index(resourceId: string): Promise<void>;
  removeFromIndex(resourceId: string): Promise<void>;
}
