"use server";

import { searchResources } from "@/server/services/search.service";
import { listUniversities, listAuthors } from "@/server/services/public-directory.service";

/**
 * Phase 2's suggestion action, extended (not replaced) in Phase 4 to
 * also surface real matching Universities/Authors — the same
 * "smallest safe change" discipline: listUniversities/listAuthors
 * already existed and were only just given an optional `q` name filter
 * (see public-directory.service.ts), so this calls existing, real,
 * already-audited functions, not a new suggestion pipeline.
 *
 * Each suggestion carries a `kind` discriminator so GlobalSearchBox can
 * render/link them distinctly (Resource vs University vs Author) —
 * University/Author suggestions are real rows from their own tables,
 * never resources mislabeled as entities.
 */
export type SearchSuggestion =
  | { kind: "resource"; id: string; title: string; slug: string; type: string; universityName: string | null }
  | { kind: "university"; id: string; title: string; slug: string; location: string | null }
  | { kind: "author"; id: string; title: string; slug: string };

export async function suggestSearchAction(query: string): Promise<{ items: SearchSuggestion[]; query: string }> {
  const q = query.trim();
  if (q.length < 2) return { items: [], query: q };

  const [resourceResult, universityResult, authorResult] = await Promise.all([
    searchResources({ q, take: 4, sort: "relevance" }),
    listUniversities({ q, take: 2 }),
    listAuthors({ q, take: 2 }),
  ]);

  const items: SearchSuggestion[] = [
    ...resourceResult.items.map((r) => ({
      kind: "resource" as const,
      id: r.id,
      title: r.title,
      slug: r.slug,
      type: r.type,
      universityName: r.university?.name ?? null,
    })),
    ...universityResult.universities.map((u) => ({
      kind: "university" as const,
      id: u.id,
      title: u.name,
      slug: u.slug,
      location: [u.city, u.country].filter(Boolean).join("، ") || null,
    })),
    ...authorResult.authors.map((a) => ({
      kind: "author" as const,
      id: a.id,
      title: a.fullName,
      slug: a.slug,
    })),
  ];

  return { items, query: q };
}
