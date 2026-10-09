import type { ResourceType } from "@prisma/client";

// French URL segments, matching the original site spec
// (/resources/cours, /resources/memoires, /resources/articles, ...).
const SEGMENT_TO_TYPE: Record<string, ResourceType> = {
  cours: "COURS",
  memoires: "MEMOIRE",
  articles: "ARTICLE",
  theses: "THESE",
  livres: "LIVRE",
};

const TYPE_TO_SEGMENT: Record<ResourceType, string> = {
  COURS: "cours",
  MEMOIRE: "memoires",
  ARTICLE: "articles",
  THESE: "theses",
  LIVRE: "livres",
};

export function urlSegmentToResourceType(segment: string): ResourceType | null {
  return SEGMENT_TO_TYPE[segment.toLowerCase()] ?? null;
}

export function resourceTypeToUrlSegment(type: ResourceType): string {
  return TYPE_TO_SEGMENT[type];
}
