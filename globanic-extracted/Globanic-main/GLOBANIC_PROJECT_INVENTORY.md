# GLOBANIC — PROJECT INVENTORY

*Focused on architecture/continuation-relevant files, not every trivial file. Cross-reference with `GLOBANIC_HANDOVER_CURRENT_STATE.md` §19 for narrative context.*

## Route Groups (`src/app/`)

- `(public)/` — public discovery surface, wraps in `layout.tsx` (SiteHeader/SiteFooter)
  - `page.tsx` — homepage
  - `search/page.tsx`, `search/loading.tsx`, `search/error.tsx`
  - `resources/page.tsx`, `resources/loading.tsx`
  - `resources/[type]/page.tsx`, `resources/[type]/loading.tsx` — **Phase 9 touched**
  - `resources/[type]/[slug]/page.tsx`, `loading.tsx`, `not-found.tsx` — **Phase 9 touched**
  - `universities/page.tsx`, `loading.tsx`
  - `universities/[slug]/page.tsx`, `loading.tsx`, `not-found.tsx`
  - `faculties/[id]/page.tsx`, `loading.tsx`, `not-found.tsx`
  - `domains/page.tsx`, `loading.tsx`
  - `domains/[slug]/page.tsx`, `loading.tsx`, `not-found.tsx`
  - `authors/page.tsx`, `loading.tsx`
  - `authors/[slug]/page.tsx`, `loading.tsx`, `not-found.tsx`
  - `publishers/[id]/page.tsx`, `loading.tsx`, `not-found.tsx`
- `(auth)/login/page.tsx`, `(auth)/register/page.tsx`
- `admin/(protected)/*` — payout-accounts, revenue-periods, payouts, moderation-logs, domains, universities, users, resources, reports (old design system — see Handover §12/§15)
- `publisher/(protected)/*` — dashboard, resources, earnings, payout-settings (old design system)
- `account/*` — student account area (own layout)
- `p/[code]/route.ts` — referral redirect endpoint (Phase 8.5)
- `api/resources/[id]/file/route.ts`, `api/resources/[id]/cover/route.ts` — protected file access
- `api/auth/[...nextauth]/route.ts`
- `sitemap.ts`, `robots.ts`

## Public Routes (unauthenticated)

`/`, `/search`, `/resources`, `/resources/[type]`, `/resources/[type]/[slug]`, `/universities`, `/universities/[slug]`, `/faculties/[id]`, `/domains`, `/domains/[slug]`, `/authors`, `/authors/[slug]`, `/publishers/[id]`, `/p/[code]`, `/login`, `/register`.

## Protected Routes (middleware-gated, `src/middleware.ts`)

`/admin/*` (ADMIN/SUPER_ADMIN), `/publisher/*` (PUBLISHER+), `/account/*` (authenticated), `/notifications/*` (authenticated).

## Server Services (`src/server/services/`)

`public-resource.service.ts` (Phase 9 touched), `public-directory.service.ts`, `taxonomy.service.ts`, `search.service.ts`, `analytics-tracking.service.ts`, `analytics-query.service.ts`, `referral.service.ts` (Phase 8.5), `resource.service.ts`, `resource-access.service.ts`, `resource-upload.service.ts`, `resource-version.service.ts`, `moderation.service.ts`, `moderation-log.service.ts`, `report.service.ts`, `payout.service.ts`, `payout-account.service.ts`, `revenue-period.service.ts`, `platform-stats.service.ts`.

## Server Actions (`src/server/actions/`)

`auth.actions.ts`, `referral.actions.ts` (Phase 8.5), `analytics.actions.ts`, `report.actions.ts`, `public-resource.actions.ts`, `search-suggest.actions.ts`, `resource-upload.actions.ts`, `publisher-application.actions.ts`, `publisher-payout-account.actions.ts`, `admin-payout.actions.ts`, `admin-resource.actions.ts`, `admin-university.actions.ts`, `admin-domain.actions.ts`, `user-admin.actions.ts`, `notification.actions.ts`, `follow.actions.ts`.

## Auth / Security (`src/server/auth/`, `src/server/security/`)

`auth.ts`, `auth.config.ts`, `rbac.ts`, `password.ts` — `src/server/security/payout-encryption.ts`.

## Search Provider (`src/server/search/`)

`index.ts`, `search.interface.ts`, `postgres.provider.ts`.

## Components (`src/components/`)

- `ui/` — `Button.tsx`, `Badge.tsx`, `Input.tsx` (Phase 1 primitives)
- `layout/` — `SiteHeader.tsx`, `SiteFooter.tsx`, `MobileNav.tsx`, `AccountMenu.tsx`, `GlobalSearchBox.tsx`
- `search/` — `SearchFilterBar.tsx`
- `resources/` — `ResourceCard.tsx` (old tokens, deliberately unmigrated), `ResourceListPagination.tsx` (old tokens), `ResourceViewTracker.tsx`, `ShareResourceButton.tsx`, `ResourcesListSkeleton.tsx`, `ResourceForm.tsx`
- `authors/` — `FollowToggleButton.tsx`
- `analytics/` — `BookmarkToggleButton.tsx`, `StatCard.tsx`, `AnalyticsChart.tsx`
- `reports/` — `ReportResourceForm.tsx`
- `publisher/` — `ReferralLinkPanel.tsx` (Phase 8.5)
- `seo/` — `JsonLd.tsx`
- `admin/` — old design system, multiple files (payout accounts, revenue periods, moderation badges, etc.)
- `auth/` — `LoginForm.tsx` (Phase 8.5 touched — login-merge call), `RegisterForm.tsx`, `LogoutButton.tsx`

## Prisma (`prisma/`)

- `schema.prisma` — 30 models, 15 enums (see Handover §5)
- `migrations/` — in order: `20260821000000_add_resource_search_vector`, `20260824000000_add_change_role_moderation_action`, `20260902000000_add_report_id_to_moderation_log`, `20260903000000_add_catalog_moderation_actions`, `20260907000000_add_publisher_payout_subsystem`, `20260907010000_add_publisher_share_percentage_override`, `20260907020000_add_payout_account_race_guard`, `20260908000000_add_publisher_referral_attribution`
- `seed.ts` — safe seed script (refuses to run without explicit password input)
- `seed_admin.sql` — **flagged HIGH in the audit, hardcoded hash, not yet remediated**

## Tests (`tests/`)

- `setup/env.ts`, `setup/factories.ts` — Vitest test-DB harness (requires a real `TEST_DATABASE_URL`, never runs against `DATABASE_URL`)
- `integration/` (12 files): `payout-state-machine.test.ts`, `duplicate-payout.test.ts`, `revenue-calculation.test.ts`, `decimal-money.test.ts`, `revenue-period-finalization.test.ts`, `publisher-share-override.test.ts`, `authorization.test.ts`, `ccp-security.test.ts`, `payout-account-concurrency.test.ts`, `audit-log.test.ts`, `adsense-fraud-safety.test.ts`, `server-actions.test.ts`, `referral.test.ts` (Phase 8.5, 19 cases)
- `unit/payout-account-schema.test.ts`
- `standalone-proof/money-algorithm.proof.js` — the one thing ever actually *executed* in this project (plain `node --test`, dependency-free reimplementation of the largest-remainder algorithm, proven to catch the real rounding bug found during the payout-subsystem build)

**Total: 14 test files, 135 `it()` cases, zero ever executed against a real database.**

## Configuration

`package.json`, `tsconfig.json`, `tailwind.config.ts`, `next.config.mjs`, `vitest.config.ts`, `.env.example` (sanitized, placeholder values only), `.gitignore`.

## Documentation Files (project root)

`README.md`, `ARCHITECTURE.md`, `GLOBANIC_HANDOVER_CURRENT_STATE.md`, `GLOBANIC_HANDOVER_SUMMARY.md`, `GLOBANIC_PROJECT_INVENTORY.md` (this file).

## Phase 9 Files (exact, frozen)

`src/server/services/public-resource.service.ts`, `src/lib/seo/json-ld.ts`, `src/app/(public)/resources/[type]/page.tsx`, `src/app/(public)/resources/[type]/[slug]/page.tsx`.
