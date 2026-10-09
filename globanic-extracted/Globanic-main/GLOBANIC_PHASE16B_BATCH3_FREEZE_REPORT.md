# PHASE 16B — BATCH 3 FREEZE REPORT

## A. Objective

Extend the existing i18n system (Phase 16A foundation, Batch 1 nav/footer/admin-sidebar/search, Batch 2 resource-type/search-filter label consolidation) to cover all user-facing UI text for **Universities, Faculties, Academic Domains/Specialties, Authors, and Publishers**, while making zero changes to schema, auth, RBAC, revenue, payouts, referrals, business logic, routes, or API contracts. Database content (names, bios, titles) was never translated — only static UI strings.

## B. Files changed (19 total)

**Dictionaries (4):**
- `src/lib/i18n/dictionaries/ar.json`
- `src/lib/i18n/dictionaries/en.json`
- `src/lib/i18n/dictionaries/fr.json`
- `src/lib/i18n/dictionaries/es.json`

**Pages/components (15):**
- `src/app/(public)/universities/page.tsx`
- `src/app/(public)/universities/[slug]/page.tsx`
- `src/app/(public)/universities/[slug]/not-found.tsx`
- `src/app/(public)/faculties/[id]/page.tsx`
- `src/app/(public)/faculties/[id]/not-found.tsx`
- `src/app/(public)/domains/page.tsx`
- `src/app/(public)/domains/[slug]/page.tsx`
- `src/app/(public)/domains/[slug]/not-found.tsx`
- `src/app/(public)/authors/page.tsx`
- `src/app/(public)/authors/[slug]/page.tsx`
- `src/app/(public)/authors/[slug]/not-found.tsx`
- `src/app/(public)/publishers/[id]/page.tsx`
- `src/app/(public)/publishers/[id]/not-found.tsx`
- `src/app/(public)/publisher-guidelines/page.tsx`
- `src/components/authors/FollowToggleButton.tsx`

`loading.tsx` files under all five route groups were inspected and left untouched — they render only skeleton markup, no literal text.

## C. Components/pages migrated

All nine public-facing surfaces in scope: universities list + detail + not-found, faculty detail + not-found, domains list + detail + not-found, authors list + detail + not-found, publisher detail + not-found, publisher-guidelines (full policy page), and the client-side `FollowToggleButton`. Two files (`domains/page.tsx`, `publisher-guidelines/page.tsx`) had their `export const metadata` converted to an async `generateMetadata()` function — the minimum change required to call `getLocale()`/`getDictionary()`, matching the pattern already used elsewhere (e.g. `universities/page.tsx` from Batch 1/2 conventions). No other component architecture was changed.

## D. Dictionary keys added

Two keys added to the existing `common` namespace (`breadcrumbNav`, `publishedResourceCountSuffix` — both reused across multiple pages). Five new namespaces added: `university` (16 keys, includes faculty sub-pages), `domain` (13 keys), `author` (10 keys), `publisher` (6 keys), `publisherGuidelines` (30 keys, one per heading/paragraph/list item of the policy page).

Existing keys were reused wherever semantically identical, instead of duplicating: `nav.universities`, `nav.domains`, `nav.authors`, `nav.resources`, `common.notFound`, `common.listSeparator`, `search.resourceCountSuffix`, `search.verifiedLabel`, `search.filterAll`, `search.kindAuthor`.

## E. Number of keys before/after

| | Before | After |
|---|---|---|
| Keys per locale | 141 | **218** |
| Total new keys | — | **77** (2 in `common` + 75 across 5 new namespaces) |

## F. ar/en/fr/es parity result

**PASS.** Verified programmatically after all edits:
- All four dictionary files are valid JSON.
- All four contain exactly **218** keys.
- Zero missing keys and zero extra keys in en/fr/es relative to ar (flattened key-set diff).
- Every namespace has an identical key count across all four locales (shown per-namespace, e.g. `publisherGuidelines: 30` in all four).
- Every interpolated string (`{count}`, `{name}`, `{domain}`, `{faculty}`, `{university}`, `{location}`) has the identical placeholder set across all four locales — checked programmatically, not just spot-checked.

## G. Hardcoded strings migrated

All hardcoded Arabic UI strings in the nine in-scope pages and `FollowToggleButton.tsx` were migrated: page titles, meta descriptions, h1/h2 headings, breadcrumbs, empty states, not-found messages, CTA buttons, verified badges, resource-count suffixes, the "Follow/Following" button and its error fallback, and all ten sections (headings + body text + list items) of the Publisher Guidelines policy page.

A full post-migration sweep (Unicode-range regex, not byte-range grep, run across every file in the nine in-scope directories plus `FollowToggleButton.tsx`) found **zero remaining Arabic-script characters** — confirmed clean.

## H. Hardcoded strings intentionally left unchanged, and why

- **Person/institution/organization names** (university names, faculty names, author names, publisher display names, domain/specialty names) — these are database content, explicitly out of scope per the task brief (§4).
- **The `"..."` pending-state indicator** in `FollowToggleButton.tsx` — not linguistic content, left as-is.
- **JSON-LD structured data** (`buildUniversityJsonLd`, `buildAuthorJsonLd` in `src/lib/seo/json-ld.ts`) — explicitly listed as do-not-touch SEO logic; not opened or modified.
- **`buildPageMetadata()` itself** (`src/lib/seo/metadata.ts`) — its mechanics (noindex, allowedParams, canonical URL logic) were not touched; only the string literals passed into it were localized.

## I. Tests/checks actually performed

1. **JSON validity** — all 4 dictionary files parsed successfully with `json.load`.
2. **Key-set parity** — flattened key-set diff across all 4 locales: 0 missing, 0 extra.
3. **Final key count** — 218 keys/locale, confirmed via script output.
4. **Frozen-content integrity** — the merge script asserted (and would have raised an exception on) any attempted overwrite of an existing key; it completed without error. In addition, 11 pre-existing values (spanning `nav`, `search`, `resourceType`, `footer`, `common`) were spot-checked byte-for-byte against their original values and all matched exactly.
5. **Full hardcoded-string sweep** — Unicode-range (`\u0600`–`\u06FF`) scan across all nine in-scope directories and `FollowToggleButton.tsx`: clean, zero remaining literal Arabic.
6. **Dictionary-reference resolution** — every `dict.<namespace>.<key>`, `t("<key>")`, and `g.<key>` reference in the 15 changed code files (119 references total) was checked against the actual dictionary structure: zero unknown namespaces, zero unknown keys, zero typos.
7. **Interpolation correctness** — every dictionary string containing a `{placeholder}` was checked for: (a) identical placeholder set across all 4 locales, and (b) every placeholder actually consumed by a matching `.replace("{x}", …)` call at its call site (parenthesis-balanced check, to handle calls like `.replace("{count}", String(x._count.resources))`). Zero mismatches, zero missing replacements.

## J. Tests that could not be run

- **`npm run typecheck` (`tsc --noEmit`)**, **`npm run build`**, **`npm run lint`**, and **`npm test` (`vitest run`)** could not be executed. The archive ships with no `node_modules`, and this environment has no network access to run `npm install` (confirmed: outbound request to the npm registry was blocked). A bare globally-installed `tsc` was attempted as a fallback and, as expected, cannot resolve the project's path aliases or `next`/`react` type packages without the project's own `node_modules` — so it is not a meaningful substitute and its output is not reported as a pass/fail signal here.
- No i18n-specific automated tests exist in the repository to run in the first place (confirmed in the Batch 3 audit — `tests/` contains no file referencing i18n, locale, or dictionary).

**These are explicitly reported as not run — not claimed as passing.**

## K. Files/systems explicitly not touched

Prisma schema, database, migrations, `auth.ts`, `rbac.ts`, revenue/revenue-period/payout/payout-account services, referral service, publisher referral attribution, fraud logic, `payout-encryption.ts`, resource business logic, search business logic (`SearchFilterBar.tsx`, `resources/`, `search/` pages from Batch 1/2), SEO/JSON-LD builder logic, API routes, URL structure, resource types, existing data, existing permissions, existing auth/authz behavior, admin dashboard, publisher dashboard, and student experience. `seed_admin.sql` was not opened or modified.

## L. Known pre-existing blockers

1. **`seed_admin.sql` hardcoded bcrypt hash** — previously flagged as a pre-production blocker; recorded again here as required by the brief (§8); not addressed in Batch 3.
2. **Missing `Link` import in `authors/[slug]/page.tsx`** — a genuine, pre-existing bug discovered during the Batch 2/3 audit: the file uses `<Link href="/">…</Link>` in JSX but never imports `Link` from `next/link`. This predates Batch 3 and is unrelated to i18n. Per your explicit instruction, it was **not fixed**, since fixing it was not strictly required to complete the i18n migration of that file (the i18n edits themselves don't depend on `Link` resolving). This file will not compile as-is until that import is added — flagging it clearly so it isn't mistaken for something Batch 3 introduced or silently papered over.
3. **Documentation drift** (carried over from the pre-Batch-3 archive inspection) — `GLOBANIC_HANDOVER_SUMMARY.md`, `GLOBANIC_HANDOVER_CURRENT_STATE.md`, and `ARCHITECTURE.md` still describe the project as frozen at Phase 9 and do not mention Phase 16 at all. Batch 3 did not update these, as that was out of this batch's scope.

## M. Final Batch 3 status

**Batch 3 is functionally complete and internally verified** (dictionary correctness, parity, interpolation, and a full string sweep all pass). It has **not** been verified by an actual TypeScript compile, lint, or build, because this environment cannot install the project's dependencies. Batch 3 is being marked **FROZEN** per your instruction, with that specific limitation on record: the next environment that *can* run `npm install && npm run typecheck && npm run build` should do so before this is treated as production-verified.

**Batch 1 = FROZEN (unmodified — verified).**
**Batch 2 = FROZEN (unmodified — verified).**
**Batch 3 = FROZEN.**

Batch 4 was not started, scoped, or implemented.
