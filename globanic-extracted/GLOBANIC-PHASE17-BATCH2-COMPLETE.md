# GLOBANIC — PHASE 17 — BATCH 2 COMPLETE
Landmarks & basic ARIA (C-02, C-05, C-06)

## Executive Summary
- **Objective:** remove nested `<main>` landmarks (C-02), give the AccountMenu trigger a stable accessible name (C-05), and fix the LanguageSwitcher's invalid ARIA and hardcoded mixed-language label (C-06).
- **Status:** all three completed. **27 files** changed, with **zero** new i18n keys, dictionary edits, IDs or behavior changes.
- **Addressed:** C-02 (25 files, 50 lines), C-05 (1 line added), C-06 (3 lines, 1 added and 2 modified in place).
- **Deferred (untouched):** the 5 Batch 1 controls, C-03, C-04, L-01 to L-05, P-01 to P-13 (details below).

## Baseline
- Phase 16B ZIP: `GLOBANIC-PHASE16B-COMPLETE-AFTER-BATCH10.zip`, SHA-256 `0009f10606132d0028698609659c6ce531e9b411af3466d5f7cf4fad131303aa`. Re-hashed at the end; unchanged.
- Batch 1 predecessor: `GLOBANIC-PHASE17-BATCH1-COMPLETE.zip`, SHA-256 `8358113d7a2879d2782d65c4756a0329f4f45e5446ca1e66fdbe61a72c9297f1`. It matched its `.sha256` file, and all 292 project files matched the Batch 1 manifest (0 mismatches).
- Batch 1 vs Phase 16B: exactly the 15 files Batch 1 reported differ.
- Working copy: sandbox `/home/claude/b2/work/Globanic-main`. A read-only extraction of Batch 1 (`pre/`) and of Phase 16B (`p16b/`) were kept for comparison.
- Git: a git binary exists, but the project tree is not a repository (no `.git`). Snapshot and SHA-256 comparison was used instead.
- Pre-edit hash table (all 292 files: path, size, SHA-256): `GLOBANIC-PHASE17-BATCH2-PRE-HASHES.txt`.

## Authorized Scope
`AUTHORIZED_FILES_FOR_BATCH_2` (27 files; none overlaps the 15 Batch 1 files): the 24 pages/loading files in `(public)` listed below, `components/resources/ResourcesListSkeleton.tsx`, `components/layout/AccountMenu.tsx`, and `components/i18n/LanguageSwitcher.tsx`. The full list is in `AUTHORIZED_FILES_FOR_BATCH_2.txt`.
Files actually modified: the same 27 (authorized-but-unchanged: 0).

## Findings Before
**C-02 — reproduced and recounted from source.**
- 69 files contain `<main>` (all balanced open/close, one each).
- The only outer landmark is `app/(public)/layout.tsx:9`: `<main className="flex-1">{children}</main>`.
- **Genuinely nested: 25** = 24 files under `(public)` (pages and `loading.tsx`) + `ResourcesListSkeleton`. In each, a single `<main className="container-page py-10">` is the outermost element of the returned JSX, carries only `className`, and is used purely as a layout wrapper.
- `ResourcesListSkeleton` is imported only by `(public)/resources/loading.tsx` and `(public)/resources/[type]/loading.tsx`, so it is always inside the `(public)` main and safe to change.
- No CSS or JS selector references the `main` element.
- **Intentionally unchanged (44 `<main>` files):** these are `(auth)`, `account`, `admin`, `publisher`, `notifications`, and the root `error.tsx`/`not-found.tsx`. None of them sits under a layout that renders `<main>` (the account, admin and publisher layouts use `div`), so each is the page's only main landmark. The `(public)` layout main is also unchanged. Six `(public)` pages have no `<main>` of their own and inherit the layout's: home, search, resource detail and the three legal pages. They were not touched.

**C-05 — reproduced.** `AccountMenu.tsx:57-62`: the trigger `<button>` had no `aria-label`. Its name came from content: the avatar initial plus the `displayName` span, which is `hidden … sm:inline`. Below `sm` the name was the single initial letter (the SVG is `aria-hidden`).

**C-06 — reproduced.** `LanguageSwitcher.tsx:36`: `aria-label="اختيار اللغة / Language"` sat on a `<div>` with no role (a prohibited use of `aria-label`), and the string was hardcoded and mixed-language.

## Changes Made
**C-02 (25 files, 2 lines each):** `<main className="container-page py-10">` → `<div className="container-page py-10">` and the matching `</main>` → `</div>`.
Accessibility reason: removes a nested main landmark so each page keeps exactly one (the layout's).
Behavior preservation: tag name only. Same `className`, children, conditional rendering and position. Both are block-level elements and no CSS targets `main`. The JSX element tree is identical apart from this tag name (checked with the TypeScript AST).

| File | `<main>` line | `</main>` line |
|---|---|---|
| (public)/about/page.tsx | 21 | 94 |
| (public)/authors/[slug]/loading.tsx | 3 | 17 |
| (public)/authors/[slug]/page.tsx | 73 | 140 |
| (public)/authors/loading.tsx | 3 | 16 |
| (public)/authors/page.tsx | 43 | 76 |
| (public)/contact/page.tsx | 45 | 73 |
| (public)/domains/[slug]/loading.tsx | 3 | 17 |
| (public)/domains/[slug]/page.tsx | 78 | 192 |
| (public)/domains/loading.tsx | 3 | 13 |
| (public)/domains/page.tsx | 23 | 44 |
| (public)/faculties/[id]/loading.tsx | 3 | 12 |
| (public)/faculties/[id]/page.tsx | 67 | 101 |
| (public)/help/page.tsx | 145 | 175 |
| (public)/i18n-preview/page.tsx | 47 | 108 |
| (public)/publisher-guidelines/page.tsx | 22 | 105 |
| (public)/publishers/[id]/loading.tsx | 3 | 17 |
| (public)/publishers/[id]/page.tsx | 63 | 102 |
| (public)/resources/[type]/page.tsx | 102 | 199 |
| (public)/resources/page.tsx | 47 | 89 |
| (public)/trust/page.tsx | 21 | 88 |
| (public)/universities/[slug]/loading.tsx | 3 | 17 |
| (public)/universities/[slug]/page.tsx | 82 | 171 |
| (public)/universities/loading.tsx | 3 | 16 |
| (public)/universities/page.tsx | 43 | 74 |
| components/resources/ResourcesListSkeleton.tsx | 3 | 15 |

**C-05 — `components/layout/AccountMenu.tsx`:** added one line to the trigger button, `aria-label={displayName}`, after `aria-haspopup="menu"`.
- Reason: the name no longer depends on the responsive span. It equals the visible text at `sm` and above (label-in-name), and it avoids the initial-letter-only name below `sm`.
- Reuses existing runtime text, with no new key. No handler, state, visibility class, menu item or logout change. No `tabIndex`, key handling or focus code added.
- If `displayName` is ever empty, the empty `aria-label` is ignored and the content-derived name applies.

**C-06 — `components/i18n/LanguageSwitcher.tsx`:**
1. Import now also pulls `useTranslations` from the same `I18nProvider` module.
2. Added `const t = useTranslations("common");` after the existing hooks.
3. The container is now `<div className="flex items-center gap-1" role="group" aria-label={t("language")}>`.

Reason: `aria-label` is valid on `role="group"`, and the hardcoded mixed-language string is replaced by existing `common.language` text. That key already exists and is already used the same way in `resources/[type]/page.tsx:161`. Its values: ar "اللغة", en "Language", fr "Langue", es "Idioma".
Behavior preservation: `handleSelect`, `setPreferredLocaleAction`, `router.refresh()`, cookie/locale logic, button props (`type`, `onClick`, `disabled`, `aria-pressed`, `className`) and the buttons' visible labels are unchanged.

## Deferred
Not touched in this batch:
- **C-01, 5 controls:** `admin/users/page.tsx:77`, `PayoutRowActions.tsx:66, 72, 87`, `UserAdminActions.tsx:72` (no visible label; needs i18n authorization).
- **C-03:** status messages, live regions, field-error association.
- **C-04:** dialog focus management.
- **L-01:** AccountMenu menu keyboard model.
- **L-02:** tablist semantics.
- **L-03:** combobox/listbox structure.
- **L-04:** admin role-change behavior.
- **L-05:** contrast.
- **P-01 to P-13:** all remain, including P-11 (`lang` attributes on language names), P-02 (`aria-current`) and P-03 (heading order).

Observed only: a name that states the control's purpose (for example combining the existing `nav.account` text with the user's name) could be considered in Batch 3 alongside the L-01 menu work. It was not done here.

## Out-of-Scope Protection
Prisma, auth/RBAC, revenue, payouts, referral, fraud/audit, server actions and services, validation, `src/lib` and tests are unchanged. The four dictionaries, `package.json`, the lockfile, the config files and `globals.css` are unchanged. All of these are SHA-256 identical to the Batch 1 snapshot (see Verification).

## Verification
Static source verification only.
| Check | Result |
|---|---|
| Syntax (installed TypeScript 6.0.3, parse only, no emit) | 0 diagnostics on all 27 files, before and after |
| Nested `<main>` | 25 → 0 |
| Layout main | `(public)/layout.tsx` intact (1 open, 1 close) |
| Other `<main>` files | 44 files, all still 1 open / 1 close, byte-identical; 6 layout-reliant pages unchanged |
| Open/close balance | all `<main>` balanced across `src` |
| C-02 JSX tree | identical to before except `main`→`div` in all 25 files |
| C-02 diff | 50 changed lines in 25 files, each exactly `main`→`div`; line counts unchanged |
| C-05 | one pure insertion; trigger has exactly 1 `aria-label` and 0 `aria-labelledby`; visible span retained |
| C-06 | `role="group"` + `aria-label`; 0 Arabic literals remain in code; handlers unchanged; buttons stay native `<button>` and keyboard reachable |
| Duplicate IDs | none added or altered (`id=` count 0 → 0 in changed files) |
| Unauthorized files | 0 (changed 27 ⊆ authorized 27) |
| Extra / deleted files | 0 / 0 (292 = 292) |
| Dictionaries | 4 files byte-identical; 1050 keys each; parity complete; no new keys |
| Protected groups changed: package+lock, config, globals.css, prisma (14), auth (4), `src/server` (56), `src/lib` (31), tests (17), env/sql (15) | 0 each |
| Cumulative vs Phase 16B | 42 files = 15 (Batch 1) + 27 (Batch 2), no overlap |
| Phase 16B ZIP, Batch 1 ZIP | unchanged |
| Hashes | before: `GLOBANIC-PHASE17-BATCH2-PRE-HASHES.txt`; after: `…POST-HASHES.txt`; also embedded in the manifest |

## Environment Limitations
Browser: not available. axe/pa11y: not available. ESLint / jsx-a11y: not available. `node_modules`: absent. Network: not used. Nothing was installed. The project's type-check, build, tests and lint did not run. Runtime, browser, accessibility-tree and assistive-technology behavior were not verified. The computed accessible names above are derived from source reading.
Housekeeping: an empty scratch directory with a literal brace name was created in the sandbox by a shell mistake and removed. It was never inside the project or the ZIPs.

## Final Scope Verdict
PASS
