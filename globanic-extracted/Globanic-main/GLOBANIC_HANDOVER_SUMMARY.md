# GLOBANIC — HANDOVER SUMMARY (Read This First)

*Full detail in `GLOBANIC_HANDOVER_CURRENT_STATE.md`. This is the fast-orientation version.*

## What Globanic Is

An academic discovery platform (not a PDF repo, not a social network): Students ↔ Universities ↔ Faculties ↔ Domains ↔ Authors ↔ Publishers ↔ Resources/Articles. Publishers upload real academic content; students discover it; publishers eventually earn a real revenue share from legitimate engagement. Initial market Algeria, global ambition. Visual direction: "Academic Luxury + Editorial + Modern Technology" — restrained, typography-led, not a decorative SaaS template.

## Current Phase

**Phase 9 (Articles) is CODE-COMPLETE and FROZEN.** Phases 1–8.5 preceded it (Design System, Navigation, Homepage, Search, Resources, University/Faculty, Domains, Authors/Publishers, Referral/Attribution). **Next phase is Phase 10 — not yet scoped. Do not begin it without explicit authorization.**

## Major Architecture (one-liners)

- **Article = `Resource.type === ARTICLE`.** No separate Article model. This is permanent unless explicitly re-approved.
- **Revenue ownership = `Resource.uploadedById`, exclusively, forever.** The referral/attribution system (Phase 8.5) is metadata-only and has zero code path into revenue calculation — verified by direct grep this session.
- **View pipeline**: Raw → Valid → Eligible (`isSelfAccess`/`isStaffAccess`/`isBot`/`isDuplicate`/`isEligible` in `analytics-tracking.service.ts`). Only eligible views count toward revenue.
- **RBAC**: `payout-account:reveal`, `payout:manage`, `revenue-period:finalize` are SUPER_ADMIN-only. Everything else is service-layer-enforced independently of middleware (defense in depth).
- **Search**: real PostgreSQL full-text search (`ts_rank`), no external search engine.
- **Payout**: only CCP/Baridi Mob implemented, AES-256-GCM encrypted at rest, fails closed without `PAYOUT_ENCRYPTION_KEY`.
- **Design**: Phase 1 tokens (IBM Plex Sans/Arabic UI, Newsreader/Noto Naskh Arabic editorial, navy/slate/blue palette, `dir="rtl"` default) are live across the entire public surface (home/search/resources/universities/faculties/domains/authors/publishers/articles). **Admin and Publisher Dashboard are NOT migrated** — still the original pre-redesign visual system.

## Critical Systems — Do Not Touch Without Explicit Authorization

Payout state machine, payout encryption, revenue calculation (largest-remainder algorithm), RBAC permission tiers, the Raw→Valid→Eligible pipeline, the referral/attribution subsystem's isolation from revenue.

## Known Issues (documented, none fixed yet — see full audit in the Current-State doc §15)

- **HIGH**: `seed_admin.sql` has a hardcoded, undocumented bcrypt hash for a SUPER_ADMIN seed account. Blocks production.
- **MEDIUM (×4)**: a defense-in-depth gap in the search provider's second query; `TYPE_LABELS` duplicated across 4 files; stale/misleading copy on the publisher dashboard about view tracking "not being built yet" (it is, and works); admin + publisher dashboard still on the old design system.
- **LOW (×2)**: deprecated unused `PublisherProfile` bank columns; `robots.ts` doesn't explicitly disallow `/p/`.
- **INFO**: 135 tests exist, zero have run.

## Environment Reality

**No `node_modules`, no npm registry access, no PostgreSQL connection, no browser, no Git repository — ever, at any point in this project.** Every "complete" status across every phase means "code-complete, manually verified by reading" — never "runtime-verified." Treat every prior claim of correctness accordingly: trust the reasoning, re-verify anything safety-critical yourself before relying on it in a real environment.

## Immediate Next Step

Wait for explicit direction. If asked to continue: re-read the full Current-State document, verify the specific area you're about to touch against the actual files (not this summary), and do not start Phase 10 or fix any audit finding until told to.

## Non-Negotiables (full list in Current-State doc §17)

Article stays `Resource.type`. Revenue stays `Resource.uploadedById`-only. Referral stays revenue-independent. `PUBLISHED` filtering stays universal. SUPER_ADMIN-only permissions stay SUPER_ADMIN-only. No fake data, ever. No Git operations unless explicitly instructed.
