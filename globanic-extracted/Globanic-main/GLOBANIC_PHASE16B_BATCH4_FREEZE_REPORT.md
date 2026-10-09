# PHASE 16B — BATCH 4 FREEZE REPORT

## A. Objective

Internationalize the user-facing Authentication experience (Login, Registration, Logout) using the existing i18n architecture from Phase 16A and Batches 1–3, with zero changes to Auth.js logic, credential validation, password hashing, session/JWT handling, RBAC, or any other authentication behavior.

## B. Files changed (11 total)

**Dictionaries (4):**
- `src/lib/i18n/dictionaries/ar.json`
- `src/lib/i18n/dictionaries/en.json`
- `src/lib/i18n/dictionaries/fr.json`
- `src/lib/i18n/dictionaries/es.json`

**Code (7):**
- `src/app/(auth)/login/page.tsx`
- `src/app/(auth)/register/page.tsx`
- `src/components/auth/LoginForm.tsx`
- `src/components/auth/RegisterForm.tsx`
- `src/components/auth/LogoutButton.tsx`
- `src/server/actions/auth.actions.ts`
- `src/lib/validation/auth.schema.ts`

## C. Authentication areas migrated

- **Login**: page metadata/heading, email/password labels, submit button + pending state, client-side "invalid input" message, "invalid credentials" message, "don't have an account?" prompt + link.
- **Registration**: page metadata/heading, full name/email/password labels, submit button + pending state, all field-level validation messages (name too short/long, invalid email, password too short / needs uppercase / needs lowercase / needs number), "email already registered" error, success message, "already have an account?" prompt + link.
- **Logout**: the single button label.
- **Password reset**: audited — **does not exist** in this codebase (confirmed by repo-wide search; no route, form, or service for it). Nothing to migrate.
- **Email verification**: audited — **does not exist** in this codebase. Nothing to migrate.
- **Auth-related states** (unauthorized/session-expired/account-disabled pages): audited — **do not exist**. `src/middleware.ts` handles all auth gating via silent redirects to `/login` or `/`, with no intermediate user-facing message page.
- **Auth navigation** (sign-in/sign-up/logout links elsewhere in the app): audited — already fully localized in Batch 1 (`nav.login`, `nav.createAccount`, `nav.logout` in `SiteHeader.tsx`, `MobileNav.tsx`, `AccountMenu.tsx`); reused here rather than duplicated.

## D. Dictionary changes

**Namespace added:** `auth` (flat structure — matches the existing convention; confirmed by audit that no dictionary namespace anywhere in the project uses nesting).

**19 new keys** in `auth`: `registerHeading`, `emailLabel`, `passwordLabel`, `fullNameLabel`, `noAccountPrompt`, `haveAccountPrompt`, `signingInPending`, `creatingAccountPending`, `invalidInputError`, `invalidCredentialsError`, `emailAlreadyRegisteredError`, `registerSuccessMessage`, `errorFullNameTooShort`, `errorFullNameTooLong`, `errorEmailInvalid`, `errorPasswordTooShort`, `errorPasswordNeedsUppercase`, `errorPasswordNeedsLowercase`, `errorPasswordNeedsNumber`.

**Existing keys reused** (no duplication): `nav.login` (login page title/h1, login submit button, register page's "sign in" link, register success state's "sign in" link), `nav.createAccount` (register page title, register submit button, login page's "create account" link).

**Final key count: 237 keys × 4 locales** (218 at end of Batch 3 + 19 new).

### A note on `auth.schema.ts` — read before treating this as routine

To translate the registration validation messages (in scope per your brief, §3 "Validation messages"), the two Zod message strings that were previously literal Arabic text (`min(2, "...")`, `.email("...")`, etc.) were changed to stable string **codes** (`"fullNameTooShort"`, `"emailInvalid"`, etc.), with `auth.actions.ts` now mapping each code to a localized string via the dictionary. **The validation rules themselves are byte-for-byte unchanged**: same `min(2)`, `max(100)`, `min(8)`, same three regexes, same order, same schema shape. Only the message attached to each rule changed from "Arabic text" to "short code + i18n lookup" — the exact pattern your brief's §9 pre-authorized ("if an error code is currently mapped to a displayed message, preserve the existing logic and only replace the displayed string with an i18n lookup"). I'm flagging this prominently rather than burying it, since it touches `auth.schema.ts`, a file in the do-not-touch list — the change is confined to display-string identity, not validation behavior, but you should know it happened. `loginSchema` in the same file was deliberately left with its original Arabic literals untouched: `LoginForm.tsx` never surfaces Zod's per-field messages (it only branches on `parsed.success` and shows one generic message on failure), so those strings are dead code from a display standpoint and needed no change.

## E. Locale parity

**PASS.** All four dictionaries: valid JSON, **237 keys each**, zero missing/extra keys (flattened key-set diff), and every pre-existing namespace (`common` 17, `nav` 16, `i18nPreview` 13, `account` 4, `search` 53, `admin` 18, `footer` 17, `resourceType` 5, `university` 16, `domain` 13, `author` 10, `publisher` 6, `publisherGuidelines` 30) has an identical key count in all four locales, plus the new `auth` namespace at 19 keys in all four.

## F. Hardcoded-string sweep

- **Arabic**: Unicode-range scan (`\u0600`–`\u06FF`, not byte-range grep, to avoid the false positives Batch 3 hit) across all 7 code files: **zero** remaining, except the two deliberately-untouched `loginSchema` literals (documented in §D above — not a miss, a disclosed decision).
- **English/French/Spanish**: scanned for literal text between JSX tags (`>text<` pattern) across all 7 files — **zero matches**. No `placeholder=`, `aria-label=`, or `title=` attributes exist anywhere in the Batch 4 scope carrying hardcoded text (checked explicitly, not assumed).

## G. Translation reference verification

**36 dictionary references** (`dict.<ns>.<key>` and `t("<key>")`/`tNav("<key>")` calls) checked programmatically against the actual dictionary structure across the 6 files that reference the dictionary. **All 36 resolve** — zero unknown namespaces, zero unknown keys, zero typos. Additionally, cross-checked the 7 error codes producible by `registerSchema` against the 7 entries in `auth.actions.ts`'s `codeToMessage` map: **exact 1:1 match** — no schema code falls through unmapped, no mapping entry is dead.

## H. Interpolation verification

**None applicable.** The audit found no dynamic values (`{name}`, `{email}`, `{count}`, `{seconds}`) in any in-scope Login/Register/Logout string — confirmed programmatically: none of the 19 new `auth.*` values contain a `{placeholder}` in any locale. No interpolation call sites exist to verify.

## I. Regression verification

**Confirmed unchanged.** Beyond matching key counts, every pre-existing namespace's key *set* was diffed across all four locales (would catch a key silently renamed in one locale only) — no mismatches. Three specific values reused by Batch 4 (`nav.login`, `nav.createAccount`, `nav.logout`) were spot-checked byte-for-byte against their Batch-1 originals and match exactly, confirming Batch 4 reused rather than silently redefined them.

## J. Tests / checks

- **PASSED**: dictionary JSON validity, key-parity diff, regression diff, hardcoded-string sweep, dictionary-reference resolution, schema-code/mapping cross-check, interpolation check, brace/paren balance sanity check on all 7 edited files (a basic syntax sanity check only — **not a substitute for a real compile**, and not reported as one).
- **NOT RUN / BLOCKED**: `npm run typecheck` (`tsc --noEmit`), `npm run build`, `npm run lint`, `npm test` (`vitest run`). **Blocked** because the archive has no `node_modules` and this environment has no network access to run `npm install` (outbound request to the npm registry returned blocked/403, re-confirmed this session). No i18n-specific automated tests exist in the repo to begin with. **None of these are claimed as passing.**

## K. Out-of-scope issues discovered, not modified

- **RBAC/permission-denial messages** ("غير مصرح" and similar) exist hardcoded in Arabic across many server action files outside Authentication proper — `RevenuePeriodPanel.tsx`, `resource.actions.ts`, `report.actions.ts`, `admin-domain.actions.ts`, `resource-upload.actions.ts`, `publisher-application.actions.ts`, `admin-resource.actions.ts`, `user-admin.actions.ts`, `notification.actions.ts`, `publisher-payout-account.actions.ts`, `admin-payout.actions.ts`, `admin-university.actions.ts`. These are a cross-cutting authorization-messaging concern spanning Admin, Publisher, and Resource domains — not Authentication UI — and were **not touched**. Worth scoping as its own future batch.
- **`AccountMenu.tsx`** uses a bare `"؟"` (question mark) character as an avatar-initial fallback when a user has no name. Reviewed and left as-is: it's a single non-linguistic glyph, not translatable UI text (same category as the `"..."` pending-indicator precedent from Batch 3).

## L. Pre-production blockers (preserved from prior batches)

1. **`seed_admin.sql`** — hardcoded bcrypt hash for the SUPER_ADMIN seed row. Not opened, not modified.
2. **Missing `Link` import in `authors/[slug]/page.tsx`** — pre-existing, build-breaking, unrelated to i18n. Batch 4 had no dependency on this file and did not touch it. Still unresolved.
3. **Documentation drift** — `GLOBANIC_HANDOVER_SUMMARY.md`, `GLOBANIC_HANDOVER_CURRENT_STATE.md`, `ARCHITECTURE.md` still describe the project as frozen at Phase 9. Not addressed (out of scope for this batch).

## M. Final status

All freeze criteria in your brief's §17 are met: full Authentication UI audit complete (including confirming password-reset, email-verification, and auth-state pages don't exist, rather than assuming they were missed); all in-scope strings migrated; 237/237 four-locale parity; all translation references resolve; interpolation confirmed not applicable; zero Batch 1–3 regression; hardcoded-string sweep clean (with the one disclosed, deliberate exception); available checks run and their results reported honestly, with build/test tools explicitly marked BLOCKED rather than guessed at; complete changed-file list produced.

**BATCH 4 — FROZEN.**

Batch 1 = FROZEN. Batch 2 = FROZEN. Batch 3 = FROZEN. Batch 4 = FROZEN.

Batch 5 was not started, scoped, or implemented. Student experience, Publisher Dashboard, and Admin Dashboard work were not touched.
