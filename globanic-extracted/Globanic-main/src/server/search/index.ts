import type { SearchProvider } from "./search.interface";

let cachedProvider: SearchProvider | null = null;

/**
 * Returns the active SearchProvider, chosen by SEARCH_PROVIDER.
 *
 *   SEARCH_PROVIDER=postgres  -> PostgresSearchProvider (default, this phase)
 *
 * A future MeilisearchProvider/ElasticsearchProvider would be added here
 * exactly like S3StorageProvider was added to getStorageProvider() —
 * dynamically imported so its client library is never required unless
 * actually selected.
 */
export async function getSearchProvider(): Promise<SearchProvider> {
  if (cachedProvider) return cachedProvider;

  const providerName = process.env.SEARCH_PROVIDER ?? "postgres";

  if (providerName === "postgres") {
    const { PostgresSearchProvider } = await import("./postgres.provider");
    cachedProvider = new PostgresSearchProvider();
    return cachedProvider;
  }

  throw new Error(
    `Unknown SEARCH_PROVIDER "${providerName}". Only "postgres" is implemented in this phase — Meilisearch/Elasticsearch providers are explicitly out of scope for Phase 10.`,
  );
}

export type {
  SearchProvider,
  SearchQuery,
  SearchResult,
  SearchFilters,
  SearchSort,
} from "./search.interface";
