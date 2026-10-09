# GLOBANIC — HANDOVER: CURRENT STATE

*Prepared as a Claude-to-Claude handover. Describes the project exactly as it exists in this working directory (`/home/claude/Globanic-main`) at handover time — not an idealized target. Read this before touching any code.*

---

## 1. Project Identity

**Globanic** is an academic discovery and knowledge platform, not a generic file-sharing site, not a social network, not a university portal clone. It connects: Students ↔ Universities ↔ Faculties ↔ Academic Domains ↔ Authors ↔ Publishers ↔ Resources ↔ Articles. The core loop: a publisher uploads academic resources (courses, theses, memoirs, books, articles); students discover them via search/browsing; the platform tracks legitimate engagement; publishers eventually earn a real revenue share from that engagement (payout infrastructure exists; the actual monetization/AdSense integration does not exist yet — see §8).

Initial market: Algeria. Long-term ambition: a global academic discovery platform. Design direction: "Academic Luxury + Editorial + Modern Technology + Global Platform" — restrained, typography-led, not a decorative SaaS template (see §12).

**Globanic is NOT**: a PDF repository, a document CMS, a social feed, a marketplace, a generic Tailwind-starter-looking app.

## 2. Current Development Status

- **Phases 1–9 implemented** (Design System → Navigation/Search infra → Homepage → Search & Discovery → Resource Experience → University/Faculty → Academic Domains → Authors & Publishers → Publisher Referral/Attribution [8.5] → Articles).
- **Phase 9 (Articles) is CODE-COMPLETE, FROZEN.** No further Article work is authorized until explicitly resumed.
- **Next intended phase**: Phase 10 (not yet defined/authorized — do not begin it from reading this document).
- **Known incomplete work**: Admin panel and Publisher dashboard were **never migrated** to the Phase 1 design system — they remain on the pre-redesign visual system (confirmed: 22 admin files + 9 publisher-dashboard files still use old tokens; zero use new tokens). This was originally planned as later phases (Publisher Dashboard, Admin Dashboard) that were never reached.
- **Runtime verification status: NONE, at any point in this project's history.** No `npm install` has ever succeeded (no network / npm registry access in this sandbox — confirmed 403 Forbidden from `registry.npmjs.org`). No `node_modules` directory has ever existed here. Consequently: no TypeScript compilation, no `next build`, no `next lint`, no database migration has ever actually run against a real Postgres instance, and no browser has ever rendered any page. **Every claim of correctness in this project is "code-verified" (manual reading, static cross-checking, brace/paren balance checks) — never "runtime-verified."**
- **Tests**: 135 real test cases exist across 14 files (Vitest, `tests/integration/*.test.ts`, `tests/unit/*.test.ts`). **None have ever executed**, for the same reason as above.
- **Git**: there is no Git repository in this working directory at all (confirmed: `git status` → "fatal: not a git repository"). This directory was extracted from an uploaded zip and has never been `git init`'d during this project's history. GitHub, if it exists at all for this project, is explicitly documented by the project owner as containing an *older* version and is NOT the source of truth — this working directory is.

## 3. Tech Stack (from `package.json`, not guessed)

- Next.js `^14.2.0` (App Router)
- React `^18.3.0`, React DOM `^18.3.0`
- TypeScript `^5.5.0`
- Prisma `^5.20.0` + `@prisma/client ^5.20.0`
- next-auth `5.0.0-beta.25` (Auth.js v5, credentials provider)
- Tailwind CSS `^3.4.4`
- Vitest `^2.1.4` (test runner — see §15, never executed)
- zod `^3.23.0` (validation)
- bcryptjs `^2.4.3` (password hashing)
- `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` `^3.637.0` (S3-compatible storage; a `local` provider also exists for dev — see `STORAGE_PROVIDER` env var)
- recharts `^2.12.7` (publisher dashboard charts)
- tsx `^4.16.0` (seed script runner)
- Deployment target: Vercel (referenced in `.gitignore`/`next.config.mjs`, not independently verified as actually deployed)
- Database: PostgreSQL (via `DATABASE_URL`)

## 4. Complete Architecture

- **App Router**, route groups: `(auth)` for login/register, `(public)` for the entire public discovery surface (home, resources, universities, faculties, domains, authors, publishers, search, articles-via-resource-type). `admin/(protected)`, `publisher/(protected)`, `account` are separate, middleware-gated trees.
- **Server-first**: pages are async Server Components by default; Client Components are isolated to genuinely interactive pieces (search box, bookmark/follow toggles, forms).
- **Service layer**: `src/server/services/*.ts` — all Prisma access goes through these, never directly from page components except via the service functions. Key files: `public-resource.service.ts`, `public-directory.service.ts`, `taxonomy.service.ts`, `search.service.ts`, `analytics-tracking.service.ts`, `referral.service.ts`, `payout.service.ts`, `payout-account.service.ts`, `revenue-period.service.ts`, `resource-access.service.ts`, `moderation-log.service.ts`.
- **Server Actions**: `src/server/actions/*.ts` — thin wrappers around services, handle auth/session extraction and return typed `{success, message, errors?}` shapes for forms.
- **Prisma**: single `prisma` client singleton (`src/lib/prisma.ts`), imported everywhere.
- **Auth flow**: Auth.js v5 credentials provider (`src/server/auth/auth.config.ts`/`auth.ts`), JWT session strategy, session re-validated against the DB on each request (role/status changes take effect immediately, not just on token expiry).
- **Authorization**: centralized in `src/server/auth/rbac.ts` — a permission-string-based system (`can(role, action)`), not per-route ad hoc checks. Every service function that needs authorization calls `can()` or `requireRole()` itself — **never trust middleware alone** (middleware only gates route access by role, individual server functions re-check permissions independently — defense in depth, established pattern throughout).
- **Public/private boundary principle**: every query touching `Resource` in a public-facing service MUST filter `status: 'PUBLISHED'`. This is the single most important invariant in the codebase (see §17).

## 5. Database / Prisma — 30 models, 15 enums (confirmed by direct count, not estimated)

Full model list: `User, Profile, PublisherProfile, PublisherApplication, Account, Session, Author, AuthorUser, University, Faculty, Domain, Specialty, Category, ResourceCategory, Resource, ResourceAuthor, ResourceVersion, ResourceFile, ResourceView, PublisherReferralLink, ReferralAttribution, ResourceDownload, Favorite, Follow, Notification, Report, ModerationLog, PublisherPayoutAccount, RevenuePeriod, PublisherPayout`.

**Confirmed unused legacy models** (found by grep — zero references in application code): `Category`, `ResourceCategory`. These predate the `Domain`/`Specialty` taxonomy that actually powers the app today. Do not build on them; do not assume they're wired to anything.

**Key models and their real fields (not idealized):**

- **`User`**: `id, email, passwordHash, role (Role enum: USER|PUBLISHER|ADMIN|SUPER_ADMIN), status (ACTIVE|SUSPENDED)`, relations: `profile, publisherProfile, resourcesUploaded (Resource[] via "UploadedBy"), payoutAccounts, referralLinks, referralAttributions`.
- **`Profile`**: 1:1 with User, holds `fullName` (used as the public display name everywhere — publisher identity, author-linked-user identity, etc).
- **`PublisherProfile`**: 1:1 with User. Has `academicStatus`, a University/Specialty affiliation, `academicEmail`, `verifiedAt` (real verification signal — publisher is "verified" iff this is non-null), `payoutSharePercentage` (nullable override of the platform-default revenue share). **Deprecated, unused fields still present**: `bankAccountHolder`, `bankName`, `bankRIB`, `paymentInfoUpdatedAt` — superseded by `PublisherPayoutAccount`, never backfilled/dropped (documented decision, not an oversight). **No public bio/logo/organization-name field exists** — this is why there is no full public Publisher directory (see §9-adjacent, Phase 8).
- **`Author`**: standalone academic identity, `id, slug, fullName, bio?, avatarUrl?, verified, universityId?→University`, `resources (ResourceAuthor[])`, `followers (Follow[])`. Can exist independent of a `User` account; `AuthorUser` is the optional join when an Author is also a platform user.
- **`Resource`**: the central content object. `id, slug, type (ResourceType: COURS|MEMOIRE|ARTICLE|THESE|LIVRE), status (ResourceStatus, includes PUBLISHED), title, description?, abstract?, keywords[], language?, level?, year?, uploadedById→User, universityId?, facultyId?, domainId?, specialtyId?, publishedAt?, createdAt, updatedAt, viewsCount, downloadsCount, bookmarksCount`. **`ARTICLE` is a `type` value, not a separate model — this is load-bearing across the entire app and must never change without an explicit, separately-approved decision.**
- **`Faculty`**: real but minimal — `id, name, universityId→University`, **no slug field** (deliberate: id used directly in `/faculties/[id]` rather than an unjustified migration).
- **`ResourceView`**: the raw analytics event. `resourceId, sessionId, userId?, ipHash, userAgent, isDuplicate, isSelfAccess, isStaffAccess, isBot, isEligible, qualifiedAt?, referralAttributionId?→ReferralAttribution, createdAt`. See §7/§8 for the eligibility pipeline.
- **`PublisherReferralLink`** / **`ReferralAttribution`**: Phase 8.5's referral subsystem — see §9.
- **`PublisherPayoutAccount`**: encrypted CCP/Baridi Mob (currently the only real payout method) account data — see §10.
- **`RevenuePeriod`** / **`PublisherPayout`**: the actual revenue/payout ledger — see §10.

## 6. Authentication and RBAC

- Auth.js v5, credentials-based, JWT strategy, session validated against DB per-request (role changes / suspensions take effect immediately).
- Roles: `USER < PUBLISHER < ADMIN < SUPER_ADMIN` (not a strict hierarchy in code — each role has its own explicit permission array in `rbac.ts`, `ADMIN`/`SUPER_ADMIN` share a base set via `ADMIN_ACTIONS` plus `SUPER_ADMIN` gets an additional `SUPER_ADMIN_ONLY_ACTIONS` array).
- **Critical, re-verified-this-session permission tiering** (do not weaken):
  - `payout-account:reveal` → **SUPER_ADMIN only** (decrypting real CCP/RIP data)
  - `payout:manage` (approve/mark-paid/mark-failed) → **SUPER_ADMIN only**
  - `revenue-period:finalize` → **SUPER_ADMIN only**
  - `payout:view` (read-only payout queue) → ADMIN + SUPER_ADMIN
  - `payout-account:verify` (verify/reject submitted accounts, non-monetary) → ADMIN + SUPER_ADMIN
  - `revenue-period:manage` (create DRAFT periods only) → ADMIN + SUPER_ADMIN
- Middleware (`src/middleware.ts`) gates `/admin/*`, `/publisher/*`, `/account/*`, `/notifications/*` by role — but every sensitive service function independently re-checks via `can()`/`requireRole()`. This is deliberate defense-in-depth, proven necessary and tested (see the payout-subsystem security audit, Phase-history §13).

## 7. Resource System

- **Lifecycle**: publisher uploads → `ResourceStatus` moderation flow (draft/pending/published/rejected — exact states in `ResourceStatus` enum) → once `PUBLISHED`, publicly visible.
- **Ownership**: `Resource.uploadedById → User` — the **sole** ownership field. No parallel ownership concept exists anywhere; do not invent one.
- **Types**: `COURS, MEMOIRE, ARTICLE, THESE, LIVRE` — display labels for these are, by established (if imperfect) convention, kept in **French** even though the rest of the UI is Arabic (`Cours`, `Mémoire`, `Article`, `Thèse`, `Livre`) — this is a deliberate, consistent, site-wide pattern discovered and preserved across multiple phases, not an inconsistency to "fix" unilaterally.
- **Public resource pages**: `/resources`, `/resources/[type]`, `/resources/[type]/[slug]` — all real, all `PUBLISHED`-filtered.
- **Related content**: `listRelatedResources`/`listRelatedArticles` in `public-resource.service.ts` — real, deterministic, tiered by priority (domain → specialty → university → author), no AI, no randomness.
- **Downloads/views**: protected via `/api/resources/[id]/file` and `/api/resources/[id]/cover` — signed/authorized access, not raw storage URLs.
- **Bookmarks**: real `Favorite`-backed system (`toggleBookmarkAction`). **Follow** (of Authors) is a separate, also-real, pre-existing system (`Follow` model, `isFollowingAuthor`/`setFollowAction`).
- **Reports**: real `Report` model + moderation flow (`submitReportAction`).

## 8. Revenue / Analytics / Fraud — the Raw → Valid → Eligible pipeline

This is the platform's most safety-critical, most heavily audited subsystem. **Do not modify without extreme care and explicit authorization.**

- `ResourceViewTracker` (client component on the public resource page) → `recordViewAction` → `recordResourceView` (`analytics-tracking.service.ts`) computes, per view: `isSelfAccess` (viewer === resource's own uploader), `isStaffAccess` (viewer is ADMIN/SUPER_ADMIN), `isBot` (User-Agent heuristic, `bot-detection.ts`), `isDuplicate` (same resource+session within a dedup window), and `isEligible` (a further dwell-time/qualification step via `qualifyViewAction`). Only `isEligible = true` views ever count toward publisher revenue.
- **Revenue calculation** (`revenue-period.service.ts`): admin manually enters a real total AdSense revenue figure for a period (no AdSense API integration exists — this is intentional, a human-entered real number, never estimated); eligible views are aggregated **by `Resource.uploadedById`**; each publisher's share uses a **largest-remainder rounding algorithm** (Decimal-exact, not floating-point — a real bug in an earlier draft of this algorithm was found and fixed during the payout-subsystem build; see Phase history) so the sum of all publisher payouts exactly equals the true owed total, never drifting due to independent per-publisher rounding.
- **Payout state machine**: `PENDING → APPROVED → PAID`, with `PENDING → FAILED` and `APPROVED → FAILED` also valid. No other transition exists. `PAID` and `FAILED` are both terminal.
- **AdSense integration itself does not exist** — no ad-serving code anywhere in the codebase (confirmed by grep). The revenue system is real infrastructure waiting for that integration, not a live monetization pipeline yet.

## 9. Publisher Referral System (Phase 8.5 — approved architecture, do not redesign)

- One **permanent** referral identity per publisher: `PublisherReferralLink` (`code` unique, publisher-chosen-derived slug, `status: ACTIVE|REVOKED`, DB-enforced one-ACTIVE-per-publisher via a partial unique index).
- Public URL: `/p/[code]` — a **redirect endpoint** (302 to homepage), not a rendered/indexable page.
- **`ReferralAttribution`** is attribution *state*, not an event log: one row per anonymous session or authenticated user, 30-day **sliding** window, refreshed (not duplicated) on a repeat touch from the same publisher, **superseded** (new row, old row's `supersededById` set) on a touch from a *different* publisher — last-referral-touch, direct/organic traffic never clears existing attribution.
- **Login merge**: first-claim-permanent — an anonymous session's live attribution is claimed by a `User` account exactly once, at the first login where one exists; a later login never overwrites an already-claimed account attribution.
- **`ResourceView.referralAttributionId`** is stamped once, at record time, from whichever attribution was live then — **never retroactively updated**, even after that attribution is later superseded.
- **Hard invariant, re-verified this session by direct grep**: zero references to "referral" anywhere in `revenue-period.service.ts`, `payout.service.ts`, `payout-account.service.ts`. `Resource.uploadedById` remains the **sole** revenue-ownership field. Referral attribution has never controlled, gated, split, or redirected revenue, and no code path exists that could make it do so accidentally.

## 10. Payout System

- **Only real payout method implemented**: CCP / Baridi Mob (Algeria). Architecture is extensible (a `PayoutMethod` enum exists with room for future methods) but nothing else is built.
- **`PublisherPayoutAccount`**: stores CCP account number, CCP key, RIP — **encrypted at rest** via AES-256-GCM (`src/server/security/payout-encryption.ts`), keyed by `PAYOUT_ENCRYPTION_KEY` env var (fails closed if unset — never falls back to plaintext). A `maskedPreview` (e.g. "CCP •••• 5821") is stored in the clear for list-view display without decryption.
- **Verification**: `PENDING_REVIEW → VERIFIED | REJECTED`, admin-gated (`payout-account:verify`).
- **Reveal** (decrypting the real account number): a **separate, SUPER_ADMIN-only** permission (`payout-account:reveal`), distinct from verify — every reveal call is individually audit-logged (`ModerationLog`, action `REVEAL_PAYOUT_ACCOUNT_DETAILS`).
- **Revenue-to-payout flow**: `RevenuePeriod` (DRAFT → FINALIZED, admin-entered real revenue figure) → finalizing computes real per-publisher `PublisherPayout` rows from real eligible-view aggregates → admin approves (SUPER_ADMIN) → admin marks paid with a real transaction reference (SUPER_ADMIN).

## 11. Search

- **PostgreSQL full-text search** (`ts_rank`, a `searchVector` generated column on `Resource`) — real relevance ranking, not arbitrary order. No Elasticsearch/Algolia/vector search/AI search anywhere.
- Real filters: type, domain, specialty, university, language, sort (relevance/recent/most_viewed/most_downloaded — all real, backed by real fields).
- Real, non-fabricated result **total count** via a second `COUNT(DISTINCT ...)` query sharing the exact same `WHERE` clause as the results query (added specifically to avoid ever showing a fabricated result count).
- Cross-entity: Universities and Authors are also real, separately-queried search result types (not just resource matches) — Domains too, at a smaller scale. Publishers and Faculty/Department/Module are **not** searchable entities (no backing infrastructure for the former beyond a thin profile; the latter two barely/don't exist — see §17).
- `/search` results are `noindex` (avoids faceted-SEO-spam risk from the large space of query/filter combinations).

## 12. Design System

- **Direction**: Academic Luxury + Editorial + Modern Technology + Global Platform. Restraint over decoration — typography/spacing/hierarchy carry the "premium" feeling, not gradients/glassmorphism/heavy shadows/oversized rounded cards (all explicitly avoided by design brief).
- **Colors**: deep academic navy (`globanic-navy`/`globanic-navyDeep`), off-white `paper`, a full `slate` neutral scale (50–950, tuned, not Tailwind's default gray), electric blue accent (`globanic-blue`/`blueLight`/`blueDeep`), amber used very sparingly (`globanic-amber`/`amberDeep`).
- **Typography**: IBM Plex Sans + IBM Plex Sans Arabic for UI (loaded as one fallback chain via `next/font`, so mixed-script text renders correctly per-glyph with no locale branching); Newsreader + Noto Naskh Arabic for editorial moments only (article headings/body) — never for navigation/buttons/tables.
- **Radius/shadow**: restrained scale — `rounded` (6px) default, `lg` (10px) max in normal use; two-step shadow system (`subtle`/`raised`), no heavy default card shadows.
- **RTL is the default**: `<html lang="ar" dir="rtl">` — this was a deliberate correctness fix (the original scaffold had `lang="fr" dir="ltr"` while the actual majority of UI copy was Arabic). Logical CSS properties (`ms-`/`me-`/`ps-`/`pe-`/`start-`/`end-`) used throughout; no hardcoded `←`/`→` characters anywhere in redesigned code (direction-aware SVG icons with `rtl:`/`ltr:` Tailwind variants used instead).
- **Migrated to this system (Phases 1–9)**: global nav/header/footer, homepage, search, resources listing + detail, universities, faculties, domains, authors, publishers, articles.
- **NOT migrated** (still pre-redesign tokens/visual system): the entire admin panel (`src/app/admin/**`), the publisher dashboard (`src/app/publisher/(protected)/**`). This is confirmed by direct grep, not assumed — see the latest full audit for exact counts.
- **AdSense placement principles** (design-only, since no ads exist yet — see §8): ads must never resemble resource cards/download buttons/search results; must never sit close enough to primary actions to risk accidental clicks; the product must remain fully valuable with zero ads.

## 13. Phase History (concise, verifiable record)

| Phase | Scope | Status |
|---|---|---|
| 1 | Design tokens, typography (IBM Plex + Newsreader/Noto Naskh), color/spacing/radius scale, base primitives (Button, Badge, Input) | Code-complete |
| 2 | Global header/footer/mobile nav/search entry, `(public)` route group restructure, fixed the lang/dir bug, first working logout in the app | Code-complete; fixed a duplicate-footer regression it had introduced, caught in Phase 3 |
| 3 | Homepage rebuild — real data only, hero + discovery sections + academic hierarchy + real stats | Code-complete; fixed hardcoded `←`/`→` arrows found during the build |
| 4 | Search & Discovery — real cross-entity search (Resources/Universities/Authors/Domains), real total counts, combobox-accessible typeahead | Code-complete |
| 5 | Resource Experience — full detail-page rebuild, publisher/faculty/specialty links, related resources, file info, share button, ResourceCard/Pagination token cleanup | Code-complete |
| 6 | University/Faculty — real Faculty pages (`/faculties/[id]`, no slug field, deliberate `id`-based URL, `noindex`), university detail enhancements | Code-complete |
| 7 | Academic Domains — real specialty filtering, derived (explicitly-labeled-as-derived) University/Author-in-domain sections | Code-complete |
| 8 | Authors & Publishers — fixed a real RTL bug (`mr-*` → natural inline spacing), new minimal `/publishers/[id]` profile (deliberately no full directory — `PublisherProfile` has no public bio/logo fields) | Code-complete |
| 8.5 | Publisher Referral/Attribution — full architecture design pass, clarification pass, then implementation: schema, `referral.service.ts`, `/p/[code]` route, login-merge integration, dashboard UI panel, 19-case test suite | Code-complete |
| 9 | Articles — tiered related-content rewrite, `authorSlug`/`language` filters, Article-specific JSON-LD, editorial listing page with real sort/language controls | Code-complete, **FROZEN** |

**Every phase above is "code-complete," never "runtime-verified"** — see §2.

## 14. Phase 9 — Articles (detail)

- **No Article Prisma model** — `Resource.type === ARTICLE` remains the sole representation, confirmed unchanged in the current schema.
- Files touched (exactly four, frozen, confirmed by the Phase 9 freeze report): `src/server/services/public-resource.service.ts`, `src/lib/seo/json-ld.ts`, `src/app/(public)/resources/[type]/page.tsx`, `src/app/(public)/resources/[type]/[slug]/page.tsx`.
- `listRelatedResources` rewritten with real tiered priority (domain → specialty → university → author); new `listRelatedArticles` scopes this to `type: ARTICLE` for the article detail page's "مقالات ذات صلة" section.
- New `buildArticleJsonLd` — real schema.org `Article` type (headline/author/dates), used only when `type === ARTICLE`; other types keep the generic `CreativeWork` builder.
- `/resources/[type]` branches visually for ARTICLE (serif heading, real sort — Latest/Most-Viewed, both real fields — and real language filter) while other resource types keep their prior, unchanged layout.
- Security/analytics: confirmed unmodified — no change to `recordResourceView`, `qualifyViewAction`, or any eligibility/RBAC/payout file this phase.

## 15. Current Audit Findings (from the most recent full audit — documented, not yet fixed)

**HIGH**
- `seed_admin.sql` (project root) contains a hardcoded bcrypt hash for a `SUPER_ADMIN` seed account (`admin@globanic.com`), completely undocumented in README/ARCHITECTURE. If ever run against a real database without a subsequent password rotation, and if the repo is/becomes public, this hash is crackable offline. **Blocks production** until resolved.

**MEDIUM**
- `postgres.provider.ts`'s second query (fetching resource rows by a server-derived id list) has no independent `status: 'PUBLISHED'` filter of its own — currently safe (the id list is always pre-filtered) but not defense-in-depth.
- `TYPE_LABELS` (resource-type display strings) duplicated verbatim across 4 files instead of one shared constant.
- Publisher dashboard displays stale copy claiming view tracking "will be built later" — false; it was built and is live since Phase 5.
- Admin + publisher-dashboard still on the pre-Phase-1 design system (22 + 9 files).

**LOW**
- Deprecated, unused `PublisherProfile` bank-field columns still present in schema (documented, intentional, pending a future backfill-then-drop).
- `robots.ts` doesn't explicitly disallow `/p/` (not a real leak — it's a redirect with no indexable content — but would be a cheap, clarifying addition).

**INFO**
- 135 tests written across 14 files, zero executed (environment limitation).

## 16. Known Limitations

- No `node_modules` — never installed, no npm registry access (confirmed `403 Forbidden` from `registry.npmjs.org` when attempted).
- No PostgreSQL connection ever established in this environment.
- No browser rendering ever performed.
- No TypeScript compiler, linter, or bundler has ever actually run.
- No Git repository exists in this working directory.
- Consequently: **all correctness claims in this project are "code-verified" via manual reading and static cross-checking — never "runtime-verified."** Any new Claude picking this up should treat every prior report's "COMPLETE" status as "complete pending a real environment's verification," not as proof of working software.

## 17. NON-NEGOTIABLE ARCHITECTURAL DECISIONS

- `Resource.type === ARTICLE` is the sole Article representation. Do not create an Article model.
- `Resource.uploadedById` is the sole revenue-ownership field, permanently. Referral attribution (`ReferralAttribution`/`ResourceView.referralAttributionId`) must never gate, split, redirect, or otherwise influence revenue or payout calculation.
- `Raw → Valid → Eligible` (isSelfAccess/isStaffAccess/isBot/isDuplicate/isEligible) is the sole view-qualification pipeline. No second counting system, no bypass, no referral-based override.
- Every public query touching `Resource` must filter `status: 'PUBLISHED'`.
- `payout-account:reveal`, `payout:manage`, `revenue-period:finalize` are SUPER_ADMIN-only. Do not weaken.
- No fake production data, ever — no fabricated counts, rankings, "featured" labels without a real curation field, testimonials, or invented relationships (e.g., never present a derived University↔Domain relationship as if it were a direct schema relation).
- Faculty has no slug field — `/faculties/[id]` is the deliberate, approved URL shape; do not add a slug migration without a fresh, explicit justification.
- `PublisherProfile` has no public bio/logo/organization-name field — this is why no full `/publishers` directory exists, only a minimal `noindex`'d `/publishers/[id]` reachable from resource pages. Do not build a public directory without first adding real public-identity fields (a schema decision, not a UI one).
- Do not redesign approved, frozen work (Phases 1–9) without explicit authorization to reopen a specific phase.
- Do not perform Git operations unless explicitly instructed — none has ever been performed in this project.

## 18. Next Development Roadmap

- **Next phase**: Phase 10 — not yet defined/scoped in this handover. Do not begin it from reading this document; wait for explicit authorization.
- **Later, previously-referenced but not-yet-reached phases** (from the original master design command): Publisher Dashboard redesign, Admin Dashboard redesign, Student Experience, full Accessibility pass, full SEO pass, full Performance pass, final visual consistency audit.
- **Explicitly deferred/out of scope until separately approved**: Communities, Social Feed, Q&A, Events, Jobs, Scholarships, AI recommendations, Department/Module models (schema doesn't support them — do not fabricate), a Country model (University.country is a free-text field, not a relation), referral campaigns/commissions/QR codes/leaderboards (Phase 8.5 built only the foundation, explicitly not these), actual AdSense integration.

## 19. File / Directory Map

- `src/app/(public)/*` — the entire public discovery surface (home, resources, universities, faculties, domains, authors, publishers, search). Wrapped by `src/app/(public)/layout.tsx` (SiteHeader + SiteFooter).
- `src/app/(auth)/*` — login/register.
- `src/app/admin/(protected)/*` — admin panel (old design system, see §12).
- `src/app/publisher/(protected)/*` — publisher dashboard (old design system, see §12).
- `src/app/account/*` — student account area (own layout, not yet touched by the redesign).
- `src/app/p/[code]/route.ts` — the referral redirect endpoint.
- `src/app/api/*` — protected file/cover download endpoints, NextAuth route.
- `src/components/ui/*` — Phase 1 primitives (Button, Badge, Input).
- `src/components/layout/*` — header/footer/search/nav.
- `src/components/resources/*`, `src/components/authors/*`, `src/components/publisher/*`, `src/components/analytics/*`, `src/components/search/*`, `src/components/reports/*`, `src/components/seo/*`, `src/components/admin/*` — feature-scoped components.
- `src/server/services/*` — all business logic / Prisma access.
- `src/server/actions/*` — Server Actions (form/mutation entry points).
- `src/server/auth/*` — Auth.js config, `rbac.ts`.
- `src/server/security/payout-encryption.ts` — AES-256-GCM for payout account data.
- `src/server/search/*` — the PostgreSQL search provider.
- `src/lib/*` — utilities (pagination, slugs, SEO metadata/JSON-LD builders, validation schemas).
- `prisma/schema.prisma` — the schema (30 models, 15 enums).
- `prisma/migrations/*` — every migration ever created in this project, in order (payout subsystem, share-percentage override, payout-account race guard, referral/attribution; the Faculty/Domain/Author phases required no migrations).
- `tests/setup/*` — Vitest test-DB factories and env setup.
- `tests/integration/*`, `tests/unit/*` — the 135 written, never-executed tests.
- `.env.example` — every required environment variable, documented with generation instructions where relevant (e.g., `PAYOUT_ENCRYPTION_KEY`).
- `seed_admin.sql` — **see §15 HIGH finding** — do not treat as safe-by-default.

## 20. INSTRUCTIONS FOR THE NEXT CLAUDE

1. This project is the complete current Globanic codebase, in this exact working directory. Treat it as ground truth.
2. GitHub, if referenced by the project owner, is explicitly **not** the current source of truth — this directory is.
3. Read this handover document (and its companion Summary and Inventory files) fully before making any change.
4. Inspect the actual code before assuming any architecture — this handover is accurate as of its creation, but re-verify anything safety-critical yourself, the same discipline used throughout this project's history.
5. Do not recreate systems that already exist (search, referral, payout, RBAC, Article-as-Resource) — extend them minimally and only when genuinely required.
6. Do not invent missing models or relations (Department, Module, Country, a Publisher directory identity) — the schema's actual shape is authoritative, not the product vision documents' aspirational language.
7. Preserve every item in §17 without exception unless the project owner explicitly authorizes reopening it.
8. Start any new work with your own architecture-verification pass against the real files — do not trust this document's field-by-field claims as a substitute for reading the actual schema/service code when precision matters.
9. Do not begin Phase 10 or any new feature work until explicitly authorized by the project owner.
10. When you finish any unit of work, re-read your own edits before reporting completion — this project's history shows real value in that habit (several genuine mistakes were caught and fixed this way, never shipped silently).
