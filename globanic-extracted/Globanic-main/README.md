# Globanic — Phase 3 ✅ + Phase 4 ✅ + Phase 5 ✅

## تشغيل المشروع محليًا

```bash
npm install
cp .env.example .env        # عدّل DATABASE_URL و NEXTAUTH_SECRET
npx prisma migrate dev --name init_resources_and_storage
# عدّل أيضًا SEED_SUPER_ADMIN_PASSWORD و SEED_PUBLISHER_PASSWORD في .env —
# لم يعد لسكريبت السيد كلمة مرور افتراضية (راجع "Production Deployment" أدناه)
npm run db:seed             # SUPER_ADMIN + PUBLISHER تجريبي + Domains + Universities
npm run dev
```

حسابات الاختبار التي ينشئها `db:seed`:
- SUPER_ADMIN: البريد من `SEED_SUPER_ADMIN_EMAIL` (أو `admin@globanic.com` افتراضيًا) — وكلمة المرور من `SEED_SUPER_ADMIN_PASSWORD` (لا يوجد قيمة افتراضية، السكريبت يتوقف بخطأ واضح إن لم تُضبط).
- PUBLISHER: نفس المبدأ عبر `SEED_PUBLISHER_EMAIL` / `SEED_PUBLISHER_PASSWORD`.

**غيّر كلمتي المرور فورًا خارج بيئة التطوير المحلية.**

## Production Deployment

Operational reference for a real deployment — not a new phase, no code behavior beyond what's
already documented above. Only commands already defined in `package.json`/`.env.example` are
referenced below; nothing platform-specific is assumed.

### Required environment variables

See `.env.example` for the full, commented list. At minimum for production:

- `DATABASE_URL` — a real PostgreSQL connection string.
- `NEXTAUTH_SECRET` — generate a fresh one per environment: `openssl rand -base64 32`. Never
  reuse the placeholder value from `.env.example`.
- `NEXTAUTH_URL` — the real production URL (e.g. `https://globanic.com`).
- `NEXT_PUBLIC_SITE_URL` — same real production domain, no trailing slash; used for canonical
  URLs, Open Graph tags, and `sitemap.xml` (Phase 12). Falls back to `http://localhost:3000` if
  unset — do not leave it unset in production.
- `STORAGE_PROVIDER=s3` plus `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`,
  `S3_ENDPOINT` (see the provider-specific examples already in `.env.example` — AWS S3 / Cloudflare
  R2 / Supabase Storage). `S3_PUBLIC_BASE_URL` is optional, only for a bucket behind a public CDN.
  `getStorageProvider()` (`src/server/storage/index.ts`) already **refuses to start** with
  `STORAGE_PROVIDER=local` when `NODE_ENV=production` — this is existing, unmodified behavior,
  not something this section adds.
- `IP_HASH_SALT` — a real random value (e.g. `openssl rand -hex 32`). Falls back to a dev-only
  default if unset; the Phase 7 download rate-limit depends on this being a real secret in
  production.
- `SEED_SUPER_ADMIN_EMAIL` / `SEED_SUPER_ADMIN_PASSWORD` and `SEED_PUBLISHER_EMAIL` /
  `SEED_PUBLISHER_PASSWORD` — see "Seed policy" below. As of this section, `prisma/seed.ts` has
  **no hardcoded fallback password** — it throws immediately if the `*_PASSWORD` variables are
  unset, rather than silently seeding a known default password.

### Migration ordering on a genuinely fresh production database

This repository's migration history is **not complete before Phase 10** — every table through
Phase 9 was created via local `prisma migrate dev`/`db push` runs during development and was
never committed as a migration file (documented in this README since Phase 10). The 4 migration
folders under `prisma/migrations/` only cover incremental changes made *after* that point
(search vector, `CHANGE_ROLE`, `ModerationLog.reportId`, the 6 catalog moderation actions).

Consequence: a **genuinely fresh** production database (nothing in it yet) needs the *entire*
`schema.prisma` applied first, before those 4 incremental migrations are relevant at all —
`prisma migrate deploy` alone will not create the base tables, because there is no initial
migration file for them. The straightforward path for a first deploy against an empty database
is `npx prisma db push` (applies the full current `schema.prisma` in one step, no migration
history required), rather than `prisma migrate deploy`. `prisma migrate deploy` becomes the
right tool only for *subsequent* deploys, once the database already has the Phase 10+ migration
history recorded in it.

### Seed policy in production

`npm run db:seed` should **not** be run against production with unset seed-password variables —
it will now fail fast instead of silently using a default password, but the safer default is to
avoid running it against production at all. It exists to bootstrap local/staging environments
(a SUPER_ADMIN account, a test PUBLISHER, and the base taxonomy of domains/universities). If a
production SUPER_ADMIN account is genuinely needed, run it once with
`SEED_SUPER_ADMIN_EMAIL`/`SEED_SUPER_ADMIN_PASSWORD` explicitly set to real, one-time values, then
change that password immediately through the application itself — the same instruction already
given for the local dev quickstart above applies with much higher stakes in production.

### Build/start (already defined in `package.json` — nothing new)

```bash
npm run typecheck   # tsc --noEmit
npm run build        # next build
npm run start         # next start
```

`prisma:generate` should run as part of your build step if your platform doesn't already run it
automatically after `npm install` (Prisma's own postinstall hook usually covers this).

### Out of scope here — documented risks, not implementation tasks

- **`next-auth` is pinned to a beta release (`5.0.0-beta.25`)**. Accepted as a known risk for now;
  an upgrade is a separate, deliberate decision, not part of this checklist.
- **No structured logging / error-tracking service** (e.g. Sentry) is wired up — only scattered
  `console.error` calls. Whether to add one is an operational decision for later, not assumed here.
- **No Dockerfile or platform-specific deployment config** exists in this repository. Whichever
  platform is chosen (Vercel, a container host, etc.) will need its own build/deploy configuration
  written separately — this section intentionally does not invent one.

## Phase 3 — Authentication + RBAC ✅ / Phase 4 — Resource System ✅
(تفاصيلهما في تقارير سابقة — لم يتغيّر أي شيء فيهما في Phase 5 باستثناء ما هو موثّق أدناه.)

## Phase 5 — File Storage: ما تم بناؤه

### بنية التخزين (provider-agnostic)

```
src/server/storage/
├── storage.interface.ts   # العقد: upload / getSignedDownloadUrl / delete
├── local.provider.ts      # للتطوير المحلي فقط (نظام الملفات)
├── s3.provider.ts         # AWS S3 / Cloudflare R2 / Supabase Storage / MinIO
└── index.ts                # factory يختار المزوّد حسب STORAGE_PROVIDER
```

لا شيء خارج `src/server/storage/` يستورد SDK مزوّد التخزين مباشرة — كل الخدمات
تتعامل فقط مع واجهة `StorageProvider`. الانتقال للإنتاج يعني فقط ضبط
`STORAGE_PROVIDER=s3` ومتغيرات `S3_*`، بدون تعديل أي سطر كود آخر.

| العنصر | الحالة |
|---|---|
| Storage interface مستقل عن المزوّد | ✅ |
| Local dev provider (نظام ملفات) | ✅ |
| S3-compatible provider (AWS S3/R2/Supabase/MinIO) — كود كامل، غير مُختبر هنا | ✅ (كود) |
| رفع PDF + صور الغلاف | ✅ |
| فحص MIME + الامتداد + **magic bytes** فعليًا (وليس فقط ما يدّعيه المتصفح) | ✅ |
| حدود الحجم (PDF 50MB / صورة 5MB)، Server Actions body limit مرفوع لـ55MB | ✅ |
| مفاتيح تخزين فريدة وآمنة (UUID، لا تُشتق من اسم الملف) | ✅ |
| Metadata كاملة في PostgreSQL (`ResourceFile`, أعمدة `coverImage*` على `Resource`) | ✅ |
| لا تُخزَّن ملفات PDF كبيانات ثنائية داخل PostgreSQL | ✅ |
| ربط الملف المرفوع بـ`ResourceVersion`/`ResourceFile` | ✅ |
| تنظيف الكائنات اليتيمة عند فشل الكتابة في القاعدة بعد نجاح الرفع | ✅ |
| استبدال آمن لصورة الغلاف (تُحذف القديمة بعد نجاح رفع الجديدة) | ✅ |
| حذف كائنات التخزين عند حذف مسودة (Resource + كل نسخه + غلافه) | ✅ |
| فحص ملكية الناشر **قبل** أي عملية رفع/حذف (fail-fast قبل I/O على التخزين) | ✅ |
| تحميل/عرض آمن عبر `/api/resources/[id]/file` و `/cover` (فحص صلاحية حقيقي، وليس رابط تخزين مباشر) | ✅ |
| لا يمكن إرسال مورد للمراجعة بدون ملف واحد على الأقل | ✅ |
| حالات تحميل/خطأ في واجهة الرفع | ✅ |
| بيانات تجريبية فقط (Seed)، لا Mock Data في التطبيق | ✅ |

### كيف يعمل الوصول الآمن للملفات

المشكلة: مورد بحالة `DRAFT` لا يجب أن يكون ملفه أو غلافه قابلين للوصول لأي
شخص يعرف الرابط. الحل المطبَّق في `resource-access.service.ts`:

```
GET /api/resources/[id]/file?version=N
GET /api/resources/[id]/cover
```

كل طلب يمر عبر:
1. قراءة الجلسة (`auth()`).
2. تحميل المورد والتحقق: إذا `status === PUBLISHED` → مسموح للجميع (حتى بدون
   جلسة). أي حالة أخرى → يجب أن يكون الطالب هو المالك (`uploadedById`) أو
   ADMIN/SUPER_ADMIN.
3. عندها فقط: تُقرأ البايتات من `LocalStorageProvider` مباشرة (dev)، أو
   يُعاد توجيه (307) إلى رابط S3 موقّع (`getSignedDownloadUrl`, صالح 5
   دقائق) في الإنتاج.

المسار الخام `/api/files/[...key]` **ليس** جزءًا من هذا التدفق — إنه أداة
تصحيح محلية فقط، بلا أي فحص صلاحية خاص بها، ويُرجع 404 تلقائيًا خارج
`NODE_ENV=development` أو عندما `STORAGE_PROVIDER != "local"`. لا تعتمد
عليه أبدًا كرابط يُعرض للمستخدم.

### قرارات تصميم مهمة

- **فحص محتوى حقيقي (magic bytes)**: لا يكفي التحقق من `file.type` أو
  امتداد الاسم — كلاهما يمكن للعميل التلاعب بهما. `file.schema.ts` يفحص
  أول بايتات الملف الفعلية (`%PDF-` لملفات PDF، توقيعات PNG/JPEG/WEBP
  للصور) ويرفض أي عدم تطابق.
- **الحذف "الأفضل جهدًا" (best-effort) للتخزين**: حذف كائن من S3/القرص لا
  يوضع أبدًا داخل نفس معاملة قاعدة البيانات (transaction) — إذا فشل حذف
  الملف الفعلي بعد نجاح حذف السجل، يُسجَّل الخطأ في الـlogs ولا يُعاد فشل
  العملية للمستخدم؛ صف قاعدة البيانات المتّسق أهم من كائن تخزين يتيم يمكن
  تنظيفه لاحقًا بمهمة صيانة دورية.
- **رفع مباشر عبر السيرفر، وليس Presigned PUT من المتصفح**: الملف يمر عبر
  Server Action إلى السيرفر ثم إلى مزوّد التخزين. هذا أبسط ويحمي بيانات
  الاعتماد (لا تصل أبدًا لعميل المتصفح) لكنه يحمّل السيرفر بحجم الملف
  كاملًا. `StorageProvider` مصمم بحيث يمكن إضافة تدفق Presigned URL مباشر
  للملفات الكبيرة جدًا لاحقًا دون كسر أي كود حالي.

## ⚠️ الفصل الواضح بين ما هو مُنفَّذ وما يحتاج بيئة حقيقية

**منفَّذ ومراجَع كودًا بالكامل هنا:**
- كل ملفات `storage/`, `resource-upload.service.ts`, `resource-access.service.ts`,
  Server Actions، مسارات API، مكوّنات الرفع، الربط بصفحة `/publisher/resources/[id]`.
- فحص توازن الأقواس على 62 ملف TS/TSX (0 اختلال).
- `tsc --noEmit` (TypeScript 6.0.3 المتوفر في البيئة) على كل الملفات: نفس نمط
  الأخطاء المتوقّع فقط (`TS2307`/`TS7026`/`TS7006`/`TS7031`/`TS2591` — كلها
  بسبب غياب `node_modules`)، صفر أخطاء منطق/صياغة جديدة.

**لم يُختبر فعليًا (يتطلب بيئة متصلة بالشبكة لا تتوفر هنا):**
- رفع ملف PDF حقيقي والتأكد أن `LocalStorageProvider` يكتب وينظّف بشكل صحيح.
- الاتصال الفعلي بأي مزوّد S3-compatible (`s3.provider.ts` لم يُشغَّل ولو مرة —
  `@aws-sdk/client-s3` غير مثبَّت في هذه البيئة).
- التحقق من أن `getSignedDownloadUrl` ينتج روابط S3 صالحة فعليًا.
- أي اختبار End-to-End لتدفق: رفع → عرض → تنزيل → حذف.

**يجب عليك تشغيله محليًا:** `npm install && npm run typecheck`، ثم رفع ملف
PDF فعلي عبر `/publisher/resources/[id]` والتأكد أنه يظهر في `.local-storage/`
وأن رابط "تنزيل" يعمل.

## إعداد التخزين للإنتاج (S3 / R2 / Supabase)

راجع `.env.example` للتفاصيل الكاملة لكل مزوّد. باختصار:

```bash
STORAGE_PROVIDER=s3
S3_REGION=...            # "auto" لـ R2
S3_BUCKET=...
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
S3_ENDPOINT=...          # فارغ لـ AWS S3، مطلوب لـ R2/Supabase/MinIO
```

التطبيق يرفض العمل بـ`STORAGE_PROVIDER=local` عندما `NODE_ENV=production`
(انظر `src/server/storage/index.ts`) — حماية من كتابة ملفات المستخدمين على
قرص مؤقت للحاوية بالخطأ.

## الخطوة التالية

Phase 5 مكتملة حسب النطاق المتفق عليه. **بانتظار موافقتك قبل بدء Phase 6.**

---

# Phase 6 — Publisher Application & Verification Workflow ✅

## ما تم بناؤه

| العنصر | الحالة |
|---|---|
| `/publisher/apply` — نموذج حقيقي (ليس placeholder) + عرض حالة الطلب الحية | ✅ |
| رفع مستند الإثبات عبر بنية Phase 5 نفسها (لا نظام تخزين ثانٍ) | ✅ |
| `publisher-application.service.ts`: submit/listMine/listForAdmin/verify/reject/suspend | ✅ |
| Verify: transaction ذرّية (application→VERIFIED + upsert PublisherProfile + User→PUBLISHER + ModerationLog + Notification) | ✅ |
| Reject: يتطلب سببًا، يُخزَّن ويظهر للمتقدّم | ✅ |
| Suspend: يعمل على أحدث طلب VERIFIED للمستخدم، PUBLISHER→USER، لا يمسّ ADMIN/SUPER_ADMIN | ✅ |
| `/admin/publisher-applications` — واجهة واحدة موحّدة (لا تكرار) بكل الحالات الأربع | ✅ |
| وصول آمن لمستند الإثبات (`/api/publisher-applications/[id]/proof`) — خاص دائمًا، حتى بعد التوثيق | ✅ |
| لا Notification UI — سطر قاعدة بيانات فقط كما طُلب | ✅ |

## قرارات معمارية مهمة

- **دمج `/admin/publishers` و`/admin/publisher-applications`** في صفحة واحدة: النطاق الأصلي
  اقترح مسارين منفصلين، لكنهما يديران نفس الجدول عمليًا. بناء الاثنين كان سيُنتج خدمة UI
  مكرَّرة — تم اختيار صفحة واحدة موحّدة بدلًا من ذلك.
- **مستند الإثبات خاص دائمًا** (`publisher-application-access.service.ts`): بخلاف ملفات
  الموارد (تُصبح عامة بعد PUBLISHED)، لا يوجد أي مسار عام هنا — حتى بعد VERIFIED، فقط
  صاحب الطلب أو ADMIN/SUPER_ADMIN. الراوت يرفض الطلبات غير المصادَق عليها (401) قبل حتى
  استدعاء خدمة الصلاحيات.
- **Suspend يعمل بـ userId، لا applicationId**: يبحث عن أحدث طلب VERIFIED لهذا المستخدم
  ويعلّقه — أدق من ربط الإجراء بصف تاريخي معيّن قد لا يكون الأحدث.
- **PublisherProfile لا يُحذف عند التعليق**: يبقى كسجل تاريخي؛ `User.role` هو مصدر الحقيقة
  الوحيد الذي يتحقق منه RBAC فعليًا.
- **معرّف الطلب يُولَّد قبل الإنشاء** (`randomUUID()`) لبناء مفتاح التخزين مسبقًا، بدل
  "إنشاء ثم تعديل" — نفس المنطق الذي استُخدم سابقًا، لكن هنا الصف نفسه غير موجود بعد.

## تغييرات قاعدة البيانات

- `PublisherApplication`: إضافة `proofFileUrl/MimeType/Size/Checksum/OriginalFilename`
  (مطابقة لنمط `coverImage*` في Phase 5)، `reviewedBy` (علاقة FK حقيقية بدل حقل نصي معلَّق)،
  `@@index([userId])`، `onDelete: SetNull` على علاقتَي الجامعة/التخصص.
- `NotificationType`: إضافة `PUBLISHER_SUSPENDED` (كانت الحالتان الأخريان موجودتين، هذه
  كانت الفجوة الوحيدة).
- `User`: علاقة عكسية جديدة `reviewedApplications` (الطلبات التي راجعها الأدمن، مختلفة عن
  `publisherApplications` التي قدّمها كمستخدم).

## ⚠️ الفصل بين المُنفَّذ والمُختبَر فعليًا

**منفَّذ ومراجَع كودًا:** كل الملفات المذكورة أعلاه، فحص توازن الأقواس على 72 ملف TS/TSX
(0 اختلال) + schema.prisma، و`tsc --noEmit` كامل (نفس نمط الأخطاء المتوقّع من غياب
`node_modules` فقط — لا أخطاء منطق جديدة).

**لم يُختبر فعليًا:** أي تدفق حقيقي (تقديم طلب → رفع مستند → موافقة أدمن → تحقق أن الدور
تغيّر فعليًا في القاعدة → وصول للوحة الناشر) — يتطلب Postgres حقيقي غير متوفر هنا. نفس
القيد بالضبط الموجود في تقارير Phase 4 و5.

## الخطوة التالية المقترحة

Phase 7 — Publisher Dashboard الحقيقية (إحصائيات Views/Downloads/Bookmarks الفعلية لكل
ناشر، بعد أن أصبح لدينا الآن كل من: نظام الموارد، التخزين، وتوثيق الناشرين). **بانتظار
موافقتك.**

---

# Phase 7 — Publisher Dashboard & Analytics ✅

## Financially-sensitive data — read this first

**Important:** publisher views/downloads may eventually feed real monetary payouts. Every
event-writing function in this phase is built around a **Raw → Valid → Eligible** pipeline:

- **Raw**: every single event is inserted, always, regardless of eligibility. Nothing is ever
  silently dropped or overwritten — this is the permanent audit layer.
- **Valid**: passed basic sanity checks (not a session-dedup duplicate within the window, for
  views; not rate-limited, for downloads).
- **Eligible**: valid AND not the resource owner AND not staff (ADMIN/SUPER_ADMIN) AND (for
  views) not a detected bot. **Only eligible events increment the denormalized counters**
  (`Resource.viewsCount`/`downloadsCount`) — the same counters a future payout phase would
  read from.

Each `ResourceView`/`ResourceDownload` row stores its own `isSelfAccess`, `isStaffAccess`,
`isDuplicate`/`isRateLimited`, and `isEligible` booleans, so a future payments phase can filter
however it needs *without re-deriving intent from scratch or rewriting the tracking writers*.
This was the explicit design goal — extending this later to add an "eligible for payout"
computation is a new read query over existing columns, not a schema/writer rewrite.

## Critical scope rule: no manufactured views

A "view" means a legitimate visit to the **public resource page** — which doesn't exist yet
(Phase 9). `recordResourceView()` is fully implemented and ready, but **nothing in Phase 7
calls it**. Opening a PDF, loading a cover thumbnail, and an admin reviewing a submission are
explicitly *not* treated as views. `Resource.viewsCount` will correctly read `0` for every
resource until Phase 9 wires the public page to call this exact function — that is expected
behavior, not a bug, and the dashboard says so directly to the publisher.

Downloads are different: the file genuinely leaves the server through
`/api/resources/[id]/file`, which is a real, unambiguous action today — so download tracking
is live now, entirely separate from view tracking (different table, different eligibility
rules, no shared code path).

## What was built

| Component | Status |
|---|---|
| `recordResourceView()` — full Raw/Valid/Eligible pipeline, session dedup, bot heuristic, self/staff exclusion | ✅ (not yet called anywhere — see above) |
| `recordResourceDownload()` — self/staff exclusion, IP rate-limiting, wired live into `/api/resources/[id]/file` | ✅ |
| `toggleResourceBookmark()` — real `Favorite` table read/write, transactional counter | ✅ |
| Publisher totals (views/downloads/bookmarks/resource counts by status) | ✅ |
| Per-resource stats with raw-vs-eligible transparency breakdown | ✅ |
| Daily/weekly/monthly series via parameterized raw SQL (`DATE_TRUNC`) | ✅ |
| Real Recharts line chart on `/publisher/dashboard` (no mock data) | ✅ |
| Bookmark toggle on `/publisher/resources/[id]` (non-owner only) — explicitly **not** the final public bookmark UX | ✅ |
| Anonymous analytics session-id cookie helper, ready for Phase 9 | ✅ |

## Anti-abuse / deduplication

- **Views**: same `(resourceId, sessionId)` within a 30-minute rolling window → `isDuplicate`.
  Basic User-Agent bot heuristic (common crawler/headless/HTTP-client signatures, or a missing
  UA) → `isBot`. This is intentionally simple — a real fraud-detection system is out of scope.
- **Downloads**: more than 5 downloads from the same IP-hash for the same resource within 60
  seconds → `isRateLimited`. IP is never stored raw — only a salted SHA-256 hash
  (`IP_HASH_SALT` env var; set a real secret in production, see `.env.example`).
- Neither table stores more personal data than the original schema already had (`sessionId`,
  optional `userId`, hashed IP). No new PII was introduced.

## Database changes

- `ResourceView`: added `isDuplicate`, `isSelfAccess`, `isStaffAccess`, `isBot`, `isEligible`;
  replaced `@@index([resourceId, sessionId])` with `@@index([resourceId, sessionId, createdAt])`;
  added `@@index([resourceId, isEligible])`.
- `ResourceDownload`: added `isSelfAccess`, `isStaffAccess`, `isRateLimited`, `isEligible`;
  added `@@index([resourceId, ipHash, createdAt])` and `@@index([resourceId, isEligible])`.
- **No new tables.** `ResourceView`, `ResourceDownload`, and `Favorite` (all present since
  Phase 1) already modeled everything this phase needed.

## New environment variable

- `IP_HASH_SALT` — salts the download rate-limit IP hash. Falls back to a dev-only default;
  **set a real random value in production** (see `.env.example`).

## ⚠️ Implemented vs. actually tested vs. requires real environment

**Implemented and reviewed in code:** everything listed above, including the raw SQL
aggregation queries (parameterized via `Prisma.sql`/`Prisma.join`, never string-interpolated).

**Actually tested here:** brace-balance check on 81 TS/TSX files + `schema.prisma` (0
unbalanced); full-project `tsc --noEmit` — identical error-code profile to every prior phase
(100% attributable to missing `node_modules`; manually confirmed the 4 `TS18046` instances are
the same pre-existing cascading pattern from unresolved imports, not new bugs).

**Requires a real environment:** no download has actually been triggered against a live
Postgres to confirm the eligibility flags and counter increments behave correctly end-to-end;
the raw `DATE_TRUNC` queries have never executed against a real Postgres instance; `recharts`
has never been rendered in a real browser. Recommended first local step: seed a resource,
download it a few times as different simulated users, and check `ResourceDownload` rows plus
`Resource.downloadsCount` in Prisma Studio.

## Recommended next phase

Phase 8, or — if you'd rather unblock real view data sooner — consider pulling forward the
minimum slice of Phase 9 (public resource page) needed to call `recordResourceView()`, since
the tracking side is now fully ready for it. Your call.

---

# Public Resource Page — pulled forward from Phase 9 ✅

Implemented after Phase 7, on your explicit direction: the analytics pipeline built in Phase 7
was otherwise fully inert (no legitimate caller existed for `recordResourceView()`). This page
is that caller — the minimum slice of Phase 9 needed to make Phase 7's work real, not a full
Phase 9 implementation.

## What was built (new)

- `src/app/resources/[type]/[slug]/page.tsx` — the real public page.
- `src/server/actions/public-resource.actions.ts` (`recordViewAction`) — Server Action wrapper
  around `recordResourceView()`, since setting the anonymous session cookie requires a Route
  Handler/Server Action context, not a Server Component render.
- `src/components/resources/ResourceViewTracker.tsx` — invisible client component, fires
  `recordViewAction` exactly once per page load via `useEffect`.
- `src/lib/utils/resource-type.ts` — URL segment ↔ `ResourceType` mapping
  (`cours`/`memoires`/`articles`/`theses`/`livres`), reusable by future listing/sitemap pages.

## What was reused, unchanged

- `getPublishedResourceBySlug()` (Phase 4's `public-resource.service.ts`) — already existed,
  already filtered to `status = PUBLISHED` only. Not modified.
- `/api/resources/[id]/cover` and `/api/resources/[id]/file` (Phase 5) — same routes, no
  changes. They already allow anonymous access once a resource is `PUBLISHED`, and the file
  route already records a real download (Phase 7) — works identically whether the request
  comes from a publisher, an admin, or now a public visitor.
- `recordResourceView()` (Phase 7) — called with zero changes to its logic. Self/staff
  exclusion, bot heuristic, and session dedup all apply exactly as designed.
- `toggleResourceBookmark()` / `toggleBookmarkAction()` (Phase 7) — reused. One small, real fix
  made here: the action's post-login redirect was hardcoded to the publisher path; it now
  accepts an optional `returnTo` so a visitor bookmarking from the public page returns to the
  public page after signing in, not to `/publisher/resources/[id]`.
- `StatCard`, `BookmarkToggleButton` (Phase 7 components) — reused as-is on the public page.

## Visitor → View → Download → Analytics flow, end to end

1. **Visitor** opens `/resources/cours/some-slug`. `getPublishedResourceBySlug` returns the
   resource only if it's `PUBLISHED`; anything else renders Next.js's standard 404 — no status
   leak, no special-casing needed since the query itself excludes non-published resources.
2. **View**: `<ResourceViewTracker>` fires once client-side, calling the `recordViewAction`
   Server Action, which calls `recordResourceView()`. That function checks self/staff/bot/dedup,
   inserts the raw `ResourceView` row regardless, and — only if eligible — increments
   `Resource.viewsCount` in the same call.
3. **Download**: the visitor clicks "Télécharger", hitting `/api/resources/[id]/file` directly
   (a real HTTP GET, not a Server Action). That route already re-checks the resource is
   accessible and calls `recordResourceDownload()`, exactly as it has since Phase 7 — nothing
   about it changed for this page.
4. **Bookmark**: clicking the toggle calls `toggleBookmarkAction`, which requires auth (redirects
   to `/login?callbackUrl=/resources/...` if anonymous, returning to the same page after
   sign-in), then flips the `Favorite` row and `Resource.bookmarksCount` transactionally.
5. **Analytics Dashboard**: the publisher's own `/publisher/dashboard` (Phase 7) reads
   `Resource.viewsCount`/`downloadsCount`/`bookmarksCount` and the `ResourceView`/
   `ResourceDownload` tables for the daily chart — the exact same aggregation queries, now
   finally fed by real visitor traffic instead of staying permanently at zero.

## Known limitations

- **No listing pages yet** (`/resources`, `/resources/cours`, `/universities`, `/authors`,
  `/domains`) — a visitor needs a direct link to a resource's URL today; there's no "browse"
  entry point. That remains real Phase 9 scope.
- **No SEO beyond a basic title/description** (`generateMetadata`) — Open Graph tags, canonical
  URLs, and JSON-LD structured data are Phase 13 (SEO) scope, deliberately not pulled forward.
- **Author/University/Domain names are plain text, not links** — `/authors/[slug]`,
  `/universities/[slug]`, `/domains/[slug]` don't exist yet; linking to them now would 404.
- Same storage/database "requires real environment" caveat as every prior phase — this has not
  been run against a live Postgres/Next.js dev server here.

---

# Analytics hardening pass ✅

Five production-readiness issues fixed in the Phase 7 analytics pipeline, per review, without
redesigning or duplicating anything.

## 1–2. Atomicity + race-condition hardening

`recordResourceView()` and `recordResourceDownload()` previously did a check (dedup / rate-limit)
then a separate insert then a separate counter increment — three independent statements. Two
problems: (a) not atomic (a crash between steps could leave `Resource.viewsCount` out of sync
with the actual `ResourceView` rows), and (b) a real race: two near-simultaneous requests could
both read "no recent duplicate" before either had inserted, and both get recorded eligible —
silently double-counting a single visit.

Fixed by wrapping each function in a single `prisma.$transaction(async (tx) => ...)` covering
the check, the insert, and the conditional counter increment together, **plus** a Postgres
advisory lock (`pg_advisory_xact_lock`, new `advisory-lock.ts` util) keyed on
`(resourceId, sessionId)` for views and `(resourceId, ipHash)` for downloads. The lock
serializes any concurrent calls for the same key so the check-then-insert can no longer race;
it's automatically released at transaction commit/rollback, so it can never be left held.

## 3. Honest download semantics

Added `DownloadDeliveryMethod` enum (`STREAM` | `REDIRECT`) as a **required** field on
`ResourceDownload`. `STREAM` = this server personally sent every byte (the local provider
today). `REDIRECT` = this server only authorized the request and redirected to a time-limited
signed URL (the S3-compatible provider) — the actual transfer happens directly between the
client and the storage provider and is **never observed by this server**. Every doc comment and
this README now consistently call these "authorized download requests", never "confirmed
downloads". The route (`/api/resources/[id]/file`) now determines which method it's about to
use *before* calling the tracker, and reports it honestly.

## 4. `isEligible` vs. future `payoutEligible`

Added a nullable `payoutEligible` column to both `ResourceView` and `ResourceDownload` —
**always `NULL` today, never computed, read, or written anywhere in this codebase.** It exists
purely to reserve the concept: `isEligible` answers "does this count as real audience
engagement" (anti-fraud/dedup), while a future payout phase will almost certainly need
additional rules on top of that (e.g. requiring `deliveryMethod = STREAM`, minimum-engagement
thresholds, payout-period windows). That phase gets a ready column instead of a migration.

## 5. Open-redirect hardening

New `isSafeRelativePath()` util (`safe-redirect.ts`): accepts only same-origin relative paths,
rejects absolute/external URLs, protocol-relative URLs (`//evil.com`), backslash-normalization
tricks, and embedded schemes (`javascript:`). Applied at both ends of the public-page bookmark
login-redirect chain:
- `toggleBookmarkAction`'s `returnTo` param — Server Actions are directly callable regardless of
  what the trusted UI passes, so this was validated server-side even though the current UI
  caller was already well-behaved.
- `LoginForm`'s `callbackUrl` query param — always attacker-controllable by definition (it's a
  URL parameter), now validated before any client-side navigation.

Both fall back to a safe default (`/publisher/resources/[id]` / `/account`) when the input
fails validation, preserving the existing "return to the same page after login" behavior for
every legitimate case.

## Checks performed

Brace-balance check on 87 TS/TSX files + `schema.prisma` (0 unbalanced). Full-project
`tsc --noEmit`: identical error-code profile to every prior phase (100% attributable to missing
`node_modules`), zero new genuine errors — manually confirmed the 4 `TS18046` instances are the
same pre-existing cascading pattern, unrelated to this pass.

## Requires a real environment

`pg_advisory_xact_lock` has never executed against a real Postgres instance here — the syntax
is standard and the Prisma `$executeRaw` tagged-template usage is correct, but concurrent-request
behavior (the actual race-condition fix) can only be verified by firing simultaneous requests at
a live server, which this sandbox cannot do.

---

# Phase 9 — Public Directory Pages: Universities, Authors, Domains ✅

Completes the public-pages half started in Phase 8. Six new pages, fully public, read-only.

## What was built

| Page | Data source |
|---|---|
| `/universities` | `listUniversities()` (new) |
| `/universities/[slug]` | `getUniversityBySlug()` (new) + `listPublishedResources({ universityId })` (Phase 4/8, extended) |
| `/authors` | `listAuthors()` (new) |
| `/authors/[slug]` | `getAuthorBySlug()` + `listPublishedResourcesByAuthor()` (both new — many-to-many via `ResourceAuthor` can't reuse `listPublishedResources`' where-shape) |
| `/domains` | `listDomainsWithSpecialties()` — **reused unmodified from Phase 4**, no new query |
| `/domains/[slug]` | `getDomainBySlug()` (new) + `listPublishedResources({ domainSlug })` (Phase 4/8, already existed, unmodified) |

## Small approved refactor: shared `parsePage()`

Extracted from the two Phase 8 pages into `src/lib/utils/pagination.ts`, with the exact same
signature and behavior — all 8 verified Phase 8 test cases (`"2"→2`, `"10"→10`, `"0"/"−1"/
`"abc"/"2abc"/"1.5"/"NaN"→1`) re-verified against the extracted version before use. Every page
across Phases 8–9 that paginates now imports the same function; zero duplicated logic.

## Reused unmodified (verified byte-for-byte identical to the Phase 8 snapshot)

`ResourceCard`, `ResourceListPagination` — not touched. `listPublishedResources` gained one
additive optional parameter (`universityId`, same pattern as the existing `domainSlug`) —
existing callers (`/resources`, `/resources/[type]`) unaffected since it's optional.

## Design decisions

- **University/domain resource counts** use `_count` with a `where` filter directly on the
  related model's own field (`Resource.status`) — the standard, well-supported Prisma pattern,
  since `Resource` is a **direct** FK relation on both `University` and `Domain`.
- **Author resource counts** deliberately do **not** use `_count` the same way. `Author` →
  `Resource` is many-to-many through `ResourceAuthor`, so filtering by `Resource.status` there
  is a relation-of-a-relation — unverified against a real Prisma client in this sandbox. Instead,
  the join rows are fetched with a plain (unambiguously-supported) nested `where` and counted in
  JS. Slightly more data over the wire at current scale; zero ambiguity about correctness.
- **Domains listing shows specialty counts, not resource counts** — an explicit, pre-agreed
  trade-off to keep `/domains` reusing `listDomainsWithSpecialties()` with literally no new
  query, rather than adding one for a small reference-data page.

## Security / PII review

Every rendered field was checked against the schema: `Author` exposes no email/contact field at
all; only `fullName`, `avatarUrl`, `bio`, `verified`, and its university link are ever rendered.
`University` exposes only institutional public fields already meant for public display (`name`,
`city`, `country`, `logoUrl`, `officialWebsite`). No new `auth()` checks were needed — nothing
here required one. `recordResourceView()` is **not** called from any of these six pages —
browsing a directory is not viewing a resource, per Phase 7's strict semantics, reconfirmed here.

## Checks performed

- Brace-balance: 99 TS/TSX files + `schema.prisma`, 0 unbalanced.
- Full `tsc --noEmit`: same known error codes as every prior phase (counts scaled up
  proportionally with the new files, as expected — no new error *categories*); the 4 `TS18046` +
  1 `TS2741` + 1 `TS2882` "interesting" cases are byte-identical in location/count to the
  pre-Phase-9 baseline.
- Full `diff -rq` against a pre-Phase-9 snapshot: exactly 4 new files + 3 modified files, 0
  deletions. `package.json` and `schema.prisma` confirmed identical. `analytics-tracking.service.ts`,
  `analytics-query.service.ts`, `storage/index.ts`, `rbac.ts`, `safe-redirect.ts`,
  `advisory-lock.ts`, `BookmarkToggleButton.tsx` individually diffed and confirmed byte-unchanged.

## Requires a real environment

Same standing caveat as every phase: none of this has executed against a live Postgres/Next.js
dev server. The one Prisma-usage decision worth re-testing first there specifically is the
`_count` + `where` pattern on `University`/`Domain` (should work) versus confirming the author
join-count approach performs acceptably once there's real data volume.

## What remains out of scope (unchanged from the approved plan)

Follow system, Search, advanced SEO, `/admin/universities` and `/admin/domains` management UI.

---

# Phase 10 — Search (PostgreSQL Full-Text Search) ✅

## Activating Full-Text Search — read this before running the app

This phase adds `prisma/migrations/20260821000000_add_resource_search_vector/migration.sql`,
the **first versioned migration ever committed to this repo**. Every prior phase asked you to
run `npx prisma migrate dev --name X` yourself locally, so no baseline migration history exists
in the repo for Phases 1–9. This matters for how you apply this one:

**If your local dev database already has all tables through Phase 9** (via your own
`prisma migrate dev`/`db push` runs after each prior phase — the normal case if you've been
following along): just run

```bash
npx prisma migrate resolve --applied 20260821000000_add_resource_search_vector
# or, simpler in dev:
npx prisma db execute --file prisma/migrations/20260821000000_add_resource_search_vector/migration.sql
```

**If you are setting up a completely fresh, empty database:** run
`npx prisma migrate dev` first (Prisma will auto-generate and apply a baseline migration for
everything in `schema.prisma`, tables included) — then apply this migration's SQL the same way
as above. The migration file itself only `ALTER TABLE`s an existing `"Resource"` table; it does
not create it.

The migration SQL is idempotent (`DROP COLUMN IF EXISTS` + `ADD COLUMN`, `CREATE INDEX IF NOT
EXISTS`) — safe to re-run. It touches only the generated `searchVector` column; `title`,
`abstract`, `description`, and `keywords` (the columns it derives from) are never modified, so
no existing data is at risk.

## What was built

| Component | Status |
|---|---|
| `Resource.searchVector` activated as a real `GENERATED ALWAYS AS (...) STORED tsvector`, weighted title(A) > keywords(B) > abstract(C) > description(D) | ✅ (migration) |
| GIN index on `searchVector` | ✅ (migration) |
| `SearchProvider` interface — the exact shape `ARCHITECTURE.md` committed to since Phase 1 | ✅ |
| `PostgresSearchProvider` — real FTS + `ts_rank` relevance + author/university `ILIKE` fallback | ✅ |
| `getSearchProvider()` factory (`SEARCH_PROVIDER` env var, same pattern as `getStorageProvider()`) | ✅ |
| `/search` — real GET-form search page, works without JS | ✅ |
| Filters: type, domain, university, language — AND-combined | ✅ |
| Sorting: relevance, recent, most viewed, most downloaded | ✅ |
| `PUBLISHED` enforced unconditionally in the query | ✅ |
| Fully parameterized SQL (`Prisma.sql`/`Prisma.empty`, zero string concatenation) | ✅ |

## Design decisions

- **Two-step query, not one giant raw query with JSON aggregation.** The raw SQL only
  determines *which* resource IDs match and in what rank order; a normal Prisma `findMany`
  reusing the already-proven `PUBLIC_RESOURCE_CARD_SELECT` (Phase 9) then fetches the actual
  nested data, re-sorted in JS to preserve the rank order (`IN (...)` doesn't guarantee order).
  This avoids hand-rolling nested-JSON SQL that can't be verified against a real Postgres
  instance in this sandbox, and reuses a query shape already used by 6+ other pages.
- **Author/university matching via `ILIKE`, not FTS.** A `GENERATED` column can only derive
  from columns on its own table — it can't span `Author`/`University`. The original spec listed
  author/university as searchable fields, so a parameterized `ILIKE` join covers them honestly
  rather than silently dropping that requirement. Upgrading this to weighted FTS across joined
  tables would need a materialized view or an external search engine — a real future step, not
  a redesign of this phase.
- **`index()`/`removeFromIndex()` are deliberate no-ops** on `PostgresSearchProvider`. Postgres's
  `GENERATED` column maintains `searchVector` automatically; there is nothing to explicitly
  index. They exist on the interface purely so a future `MeilisearchProvider` (which *would*
  need real implementations) can be added without changing the interface or any caller.

## Checks performed

- Brace-balance: 104 TS/TSX files + `schema.prisma`, 0 unbalanced. Migration SQL: `BEGIN`/`COMMIT`
  pair confirmed present exactly once each.
- Full `tsc --noEmit`: identical known error-code profile to every prior phase (counts scaled
  proportionally with new files, as expected); the specific "interesting" error locations
  (4× `TS18046`, 1× `TS2741`, 1× `TS2882`) are byte-identical in count/location to the
  pre-Phase-10 baseline.
- Manual SQL-injection review: every raw-query fragment traced — confirmed every dynamic value
  reaches the query only via `Prisma.sql` template interpolation (parameterized) or `Prisma.empty`
  (clause omission), never string concatenation. Shown explicitly in the report.
- Full `diff -rq` against a pre-Phase-10 snapshot: exactly 1 new migration + 5 new files + 2
  modified files (`schema.prisma`, `page.tsx`), 0 deletions. `package.json` unchanged (no new
  dependencies). 14 critical Phase 7/8/9 files individually diffed and confirmed byte-unchanged.

## What requires a real environment (honest accounting, per explicit request)

**Cannot be claimed as PASS without live PostgreSQL — genuinely BLOCKED here:**
- The migration has never executed against a real database.
- `websearch_to_tsquery`/`ts_rank`/the GIN index have never run.
- No FTS result-relevance, ranking, or filter-combination has been observed against real data.
- The `ILIKE` author/university fallback has never executed.

**What was live-tested (real Node execution, not inference):** none of Phase 10's own new logic
is pure/DB-independent the way `parsePage()` was in Phase 8/9 — every function here requires
Postgres. This phase has zero eligible PASS candidates for the same reason Phase 9's DB-facing
checks were BLOCKED; only the file-diff and static-inspection methods described above were
actually executed.

## What remains OUT of scope (unchanged from the approved plan)

Meilisearch/Elasticsearch implementation, autocomplete/typeahead, search analytics, fuzzy/typo
tolerance beyond native FTS+ILIKE, homepage hero redesign.

---

# Phase 11 — Follow System & Notification Center ✅

## What was built

| Component | Status |
|---|---|
| `Follow` toggle on `/authors/[slug]` — real persisted state | ✅ |
| `/notifications` — real Notification Center, protected route | ✅ |
| Real notification creation wired into resource moderation (Approve/Reject/Request Changes/Unpublish) | ✅ |
| Real `NEW_FOLLOWER` notification on follow (only when the author has a linked account) | ✅ |
| Self-follow blocked server-side | ✅ |
| Notification ownership strictly enforced (`userId = actor.id`, no admin override) | ✅ |
| **Zero schema changes** — `Follow`/`Notification` were fully modeled since Phase 1 | ✅ |

## Idempotency / reliability (this phase's specific requirement)

- **Follow uses explicit desired-state, not a blind toggle.** `setAuthorFollowState(actor, authorId, follow: boolean)` — the button computes and sends the intent (`!currentlyDisplayed`), not "flip whatever the server has". A retried `follow: true` call twice in a row only ever creates one `Follow` row and one `NEW_FOLLOWER` notification; the second call finds the row already exists and is a true no-op. Calling `follow: true` again *after* a genuine `follow: false` (unfollow) correctly creates a new notification — that really is a new event, per your explicit carve-out.
- **A Postgres advisory lock** (`toAdvisoryLockKey` — the exact utility the Analytics Hardening pass introduced, reused here rather than reinvented) serializes concurrent calls for the same `(followerId, authorId)` pair, so two simultaneous requests can't both read "not following yet" before either commits.
- **Moderation actions got the same treatment**, which needed a small structural change flagged here explicitly: each of Approve/Reject/Request-Changes/Unpublish now acquires an advisory lock keyed on `resourceId` *inside* its transaction, and re-checks the status-transition guard *inside* that lock as the authoritative check (the pre-existing outside check remains, now just a fast-fail). Two concurrent "Approve" clicks on the same resource can no longer both pass the guard and both notify — the second one now correctly sees the already-`PUBLISHED` status and fails cleanly. This is the same fix pattern the Hardening pass applied to view/download tracking, applied here for the first time — not a redesign of any approve/reject/unpublish business rule, which are byte-identical to before.
- **`markNotificationAsRead` is idempotent** — marking an already-read notification read again is a no-op, not an error.

## One scope note, disclosed as it came up

The approved plan listed `SYSTEM` as "reserved, no producer planned." Implementing `unpublishResource`'s notification surfaced that there is no dedicated `RESOURCE_UNPUBLISHED` enum value, and adding one would have meant a schema change — explicitly ruled out for this phase. `SYSTEM` is used for that one notification instead, which is exactly the kind of platform-triggered, no-more-specific-type-available message it was reserved for. No other use of `SYSTEM` was added.

## Checks performed

- Brace-balance: 111 TS/TSX files + `schema.prisma`, 0 unbalanced.
- Full `tsc --noEmit`: same known error-code profile as every prior phase; one new `TS18046` instance appeared in `follow.actions.ts`, at the exact same cascading-narrowing pattern as the 4 pre-existing ones (unresolved-import `instanceof` narrowing under `--ignoreConfig`) — confirmed not a new bug, same explainable class.
- Manual verification of every specific requirement by direct code inspection (shown in the report): notification ownership, follow idempotency, self-follow block, advisory-lock + authoritative re-check in all 4 moderation functions, notification creation inside the same transaction as the resource update + ModerationLog write in all 4, `/notifications` in the middleware matcher.
- Confirmed single definitions of `isSafeRelativePath` and `toAdvisoryLockKey`, each now reused by 3 call sites — neither was duplicated.
- Full `diff -rq` against a pre-Phase-11 snapshot: exactly 7 new files + 4 modified files, 0 deletions, matching the approved plan precisely. `package.json` and `schema.prisma` confirmed byte-identical. 13 additional prior-phase files spot-checked and confirmed unchanged.

## What requires a real environment

Same standing caveat as every phase: the advisory-lock concurrency fix (for both follow and moderation) has not been exercised under real simultaneous requests against live Postgres — only reviewable as correct code, same limitation noted for the original Hardening pass.

## What remains OUT of scope (unchanged from the approved plan)

Global header/nav/bell icon, `RESOURCE_MILESTONE` notifications, Reports system, following anything other than Authors, push/email notifications.

---

# Phase 12 — SEO (Metadata, Sitemap, Robots) ✅

## Pagination canonical/noindex strategy (the specific requirement this phase had to get right)

Every page's canonical URL is **itself** — page 2 of `/resources` is never canonicalized to
page 1. This is the current standard guidance (Google deprecated `rel=prev/next` in 2019); a
self-referencing canonical on every page in a series is correct, and canonicalizing everything
to page 1 (the mistake explicitly flagged) would incorrectly tell search engines that page 2's
distinct resources are duplicate content.

Implemented once, centrally, in `buildPageMetadata()` (`src/lib/seo/metadata.ts`) — every public
page passes an explicit `allowedParams` whitelist (e.g. `["page", "domain"]` for `/resources`,
`["page"]` for a university/author/domain detail page's own paginated resource list, `[]` for a
single resource which has no pagination dimension at all). The canonical URL is built only from
those whitelisted params actually present — `page=1` (or no page param) canonicalizes to the
bare path, which is exactly the URL that appears in `sitemap.xml`.

`/search` is the one deliberate exception: `noindex: true` (still crawlable — see `robots.ts`
below), since a query-driven results page with arbitrary `q`/filter combinations is a classic
thin/duplicate-content pattern, distinct from a structured browse listing.

## Sitemap (`src/app/sitemap.ts`)

Includes exactly what was required: `/`, `/resources`, `/universities`, `/authors`, `/domains`
(all 5 public index pages — **domains explicitly included**, both the index and every individual
domain detail page), every `PUBLISHED` resource, every university/author with at least one
published resource, and every domain. Paginated (`?page=2+`) variants are deliberately **not**
enumerated — standard sitemap practice; they're discoverable via the on-page pagination links,
consistent with the canonical strategy above (a sitemap should list canonical URLs, and page 2's
canonical is itself, not something that belongs in a "here are the entry points" sitemap).

**`lastModified`** uses the real `updatedAt` column for resources, universities, and authors —
`Resource`/`University`/`Author` have all had `@updatedAt` since Phase 1/4. `Domain` has no
`updatedAt` column in the schema; its sitemap entries omit `lastModified` entirely rather than
fabricate one from `createdAt` (creation time isn't "last modified").

## Robots (`src/app/robots.ts`)

Disallows `/admin`, `/publisher`, `/account`, `/notifications`, `/api`, `/login`, `/register`.
**`/search` is deliberately absent from the disallow list** — it relies on its own page-level
`noindex` instead, so it stays crawlable and that directive is actually seen. Disallowing it in
`robots.txt` would make the `noindex` meta tag unreachable, per standard SEO guidance (don't
`robots.txt`-block a page you want excluded via `noindex`).

## JSON-LD structured data

`Resource` → `CreativeWork` (with `learningResourceType`, author(s), publisher university,
`dateModified`/`datePublished`). `Author` → `Person`. `University` → `CollegeOrUniversity`. Built
from one shared module (`src/lib/seo/json-ld.ts`), only from real DB fields — no fabricated
data. Rendered via `<JsonLd>` (`src/components/seo/JsonLd.tsx`), which explicitly escapes every
`<` in the serialized JSON to prevent a `</script>` breakout from user-submitted text (resource
titles/descriptions come from the publisher workflow — never assumed safe). **This escaping was
live-tested** (see Checks below) against an actual injection string, not just reasoned about.

## Checks performed

- Brace-balance: 117 TS/TSX files + `schema.prisma`, 0 unbalanced.
- Full `tsc --noEmit`: identical known error-code profile to every prior phase (line numbers in
  `layout.tsx` shifted by exactly the new import line, as expected); zero new genuine errors.
- **Live-executed** the actual `JsonLd` escaping logic (`node -e`) against a crafted
  `</script><script>alert(1)</script>` payload: confirmed neither literal string survives
  serialization, and the escaped output still parses as valid JSON — a genuine runtime PASS, the
  first since `parsePage()` in Phase 8/9 (everything else in this app requires a live database).
- Direct inspection confirmed: every listing/detail page declares the correct `allowedParams`;
  `noindex: true` appears in exactly one place (`/search`); the sitemap never enumerates a
  `page=N` variant; `lastModified` is wired to real `updatedAt` for resources/universities/authors
  and correctly omitted for domains.
- Full `diff -rq` against a pre-Phase-12 snapshot: 6 new files, 14 modified files (12 pages +
  `layout.tsx` + `.env.example`), 0 deletions. `package.json`/`schema.prisma` confirmed
  byte-identical. 10 business-logic files spot-checked (moderation, follow, notification,
  resource, search, middleware, `ResourceCard`) and confirmed byte-unchanged — this phase touched
  only the presentation/metadata layer, never business logic, exactly as scoped.

## New environment variable

`NEXT_PUBLIC_SITE_URL` — used for every canonical/OG/sitemap URL. Falls back to
`http://localhost:3000` in dev; **set the real production domain before deploying**, or every
canonical/sitemap URL will silently point at localhost.

## What requires a real environment

Actual rendered `<head>` output, `/sitemap.xml`/`/robots.txt` HTTP responses, and real search
engine treatment of any of this cannot be observed without a running Next.js server and a real
crawl — genuinely BLOCKED here, same standing limitation as every DB-dependent check since
Phase 9.

## What remains OUT of scope (unchanged from the approved plan)

Dynamic OG image generation, hreflang/i18n, homepage `Organization`/`WebSite` JSON-LD,
`BreadcrumbList` structured data, Search Console verification, any visual/UI change.

---

# Phase 13 — Real Homepage ✅

Replaces the Phase 3 placeholder (`/`) with the real homepage from the original design reference:
Header, Hero + functional search, Ressources populaires, Explorer par domaine, Universités
populaires, Globanic en chiffres, Publier une ressource CTA, Dernières ressources, Footer.

## Real data, everywhere — no exceptions

Every number and every listed item traces to a live query:

| Section | Source |
|---|---|
| Ressources populaires | `listPublishedResources({ sort: "most_viewed" })` |
| Explorer par domaine | `listDomainsWithResourceCounts()` (new) |
| Universités populaires | `listTopUniversitiesByResourceCount()` (new) |
| Globanic en chiffres | `getPlatformStats()` (new) — published resources, universities, authors, users |
| Dernières ressources | `listPublishedResources({ sort: "recent" })` |

No hardcoded resource, university, author, or statistic anywhere on the page — verified by grep
(shown in this phase's verification pass): every number/list on the page originates from one of
the 4 service calls above.

## University logos (this pass's specific requirement)

The "Universités populaires" cards use each university's real `logoUrl` — never a fake or stock
image. Added `isValidHttpUrl()`: rejects empty/whitespace values *and* anything that isn't a
well-formed absolute `http`/`https` URL (defends against both broken data and a stray
`javascript:`/`data:` URL ending up in an `<img src>`). Any university that fails this check
(missing or invalid `logoUrl`) falls back to a clean initials avatar (first letter of the name)
styled consistently with the reference design — never a broken image icon, never a placeholder
photo.

## Two new query functions — why they're separate from existing ones

- **`listTopUniversitiesByResourceCount()`** is deliberately *not* built on the existing
  `listUniversities()`. "Top N by resource count" can't be correctly expressed as "take a
  name-ordered paginated page, then re-sort it" — the true top N might not even be in whichever
  page got fetched. Prisma also can't `orderBy` a *filtered* relation count directly (only an
  unfiltered `_count` aggregate is supported there). So this fetches a bounded batch (capped,
  not the full table) and sorts in JS — correct at any realistic catalog size. (An earlier
  attempt at a `sort` param on `listUniversities()` itself had exactly this bug — caught and
  reverted before implementation, not shipped.)
- **`listDomainsWithResourceCounts()`** is separate from the existing `listDomainsWithSpecialties()`
  (Phase 4/9) because the `/domains` listing page deliberately omits resource counts by design
  (a Phase 9 decision to avoid an extra query there) — this phase needed counts for the homepage
  without changing that page's behavior at all.

## Backward compatibility of extended functions — verified, not assumed

`listPublishedResources()` gained an optional `sort` param (`"recent"` default — the exact
existing behavior). `listUniversities()` was **left completely untouched** (byte-diffed against
the pre-Phase-13 snapshot and confirmed identical) after the sort-param attempt above was
reverted. Every one of the 5 existing call sites across `/resources`, `/resources/[type]`,
`/universities`, `/domains/[slug]`, `/universities/[slug]` was individually grepped and confirmed
unaffected — none of them pass `sort`, so all fall through to unchanged default behavior.

## Header / mobile menu

`HomeHeader` (new, homepage-only client component) provides a real, functional hamburger toggle
with real navigation links — not an elaborate animated drawer. The globe icon is **explicitly
decorative and non-interactive**, per your instruction: no fake language dropdown, no fabricated
i18n. Multilingual support (FR/EN/AR-RTL/ES, hreflang, a working selector) remains a distinct
future phase.

## Checks performed

- Brace-balance: 119 TS/TSX files + `schema.prisma`, 0 unbalanced.
- Full `tsc --noEmit`: identical known error-code profile to Phase 12 (same 5 "interesting"
  locations, same counts scaled proportionally with new files); zero new genuine errors.
- Direct inspection confirmed: every homepage section is fed by a real service call (no literal
  data arrays); the logo validity check and initials fallback are wired correctly; all 5 existing
  callers of the two extended functions are untouched and unaffected.
- Full `diff -rq` against a pre-Phase-13 snapshot: 2 new files (`platform-stats.service.ts`,
  `HomeHeader.tsx`) + 3 modified (`page.tsx`, `public-directory.service.ts`,
  `public-resource.service.ts`), 0 deletions. `package.json`/`schema.prisma` confirmed
  byte-identical. 9 additional business-logic/shared files spot-checked and confirmed unchanged
  — this phase touched only the homepage and its two supporting query extensions.

## What requires a real environment

Actual rendered output, real image loading (including the logo-fallback behavior in a real
browser), and real query performance — genuinely BLOCKED here, same standing limitation since
Phase 9.

## What remains OUT of scope (unchanged from the approved plan)

Full site-wide visual redesign, real language-switching functionality, an admin-wide analytics
dashboard, any change to Phases 1–12's own pages or business logic.

---

# Phase 14 — Admin User Management ✅

## The finding that grounded this phase

Before writing any code, inspection confirmed a "provisioned but inert" pattern identical to
Follow/Notification before Phase 11: `AccountStatus`, `ModerationAction.SUSPEND_USER`/
`ACTIVATE_USER`, and RBAC's `user:suspend`/`user:activate`/`user:change-role`/`user:view-any`
have all existed since Phase 1/3 — and `auth.config.ts` has checked `status !== "ACTIVE"` and
force-invalidated the session on every request since Phase 3. **Zero of that was touched.**
This phase is entirely the missing admin UI/service calling mechanisms that were already there.

## What was built

| Component | Status |
|---|---|
| `/admin/users` — search/filter by email, role, status | ✅ |
| `/admin/users/[id]` — profile, role, status, resource/application counts | ✅ |
| Suspend / Activate — immediately effective via the existing (unmodified) session check | ✅ |
| Role change — SUPER_ADMIN only, USER/ADMIN/SUPER_ADMIN only, **never PUBLISHER** | ✅ |
| Self-action and staff-targeting guardrails | ✅ |
| Idempotent mutations (no duplicate audit rows on retry) | ✅ |
| Every mutation logged to `ModerationLog` in the same transaction | ✅ |

## PUBLISHER exclusion — enforced in both directions, per your explicit instruction

`changeUserRole` rejects `newRole = PUBLISHER` outright, **and** separately rejects the operation
entirely if the *current* role is `PUBLISHER` — directing the admin to Phase 6's
`suspendPublisher` instead. This means a `PUBLISHER` account is not manageable from
`/admin/users` at all; its role can only ever move via the verification/suspension workflow that
already carries the application + proof-document audit trail. Both checks verified present by
direct inspection (shown in the implementation pass).

## Reuse, not duplication (verified, not assumed)

- **RBAC**: all 4 permissions (`user:view-any/suspend/activate/change-role`) already existed —
  zero changes to `rbac.ts`.
- **Concurrency safety**: reuses `toAdvisoryLockKey` (Phase 7 Hardening) — no new locking
  mechanism invented. Every mutation acquires a lock keyed on the target user, re-checks current
  state inside it, and no-ops (no log write) if the requested change is already the current
  state — the same idempotency discipline as `moderation.service.ts` and `follow.service.ts`.
- **Audit trail**: reuses `ModerationLog` — no new audit table.
- **UI pattern**: list/detail/status-pill-filter layout matches `/admin/resources` and
  `/admin/publisher-applications` exactly — no new visual pattern introduced.

## Database/schema changes

One enum value: `ModerationAction.CHANGE_ROLE`, added via a proper versioned migration
(`prisma/migrations/20260824000000_add_change_role_moderation_action/`), idempotent
(`ADD VALUE IF NOT EXISTS`) per the same discipline established in Phase 10. No other schema
changes — `AccountStatus` and every other enum/permission needed already existed.

## Checks performed

- Brace-balance: 124 TS/TSX files + `schema.prisma`, 0 unbalanced.
- Full `tsc --noEmit`, run fresh: identical known error-code profile to Phase 13, with exactly
  one new `TS18046` instance in `user-admin.actions.ts` — confirmed the same pre-existing
  cascading pattern (unresolved-import `instanceof` narrowing) as the other 5, not a new bug.
- Direct inspection confirmed, with grep output shown: PUBLISHER blocked in both directions;
  self/staff guardrails on all 3 mutations; idempotent no-op before every log write; advisory
  lock reused; `ModerationLog` written inside the same transaction as every `User` update; RBAC
  permissions reused, not redefined.
- Full `diff -rq` against a pre-Phase-14 snapshot, run fresh: exactly 1 new migration + schema
  change + 1 modified admin index page + 4 new files (service, actions, 2 pages, 1 component),
  0 deletions. `package.json` confirmed byte-identical (no new dependencies). 10 additional
  business-logic/prior-admin-page files individually spot-checked and confirmed byte-unchanged.

## What requires a real environment

The actual suspend→login-block behavior end-to-end, and the advisory-lock concurrency guarantee
under real simultaneous requests, have not been exercised against live Postgres — same standing
limitation as every phase since Phase 9. The *mechanism* the suspend relies on
(`auth.config.ts`'s status check) is itself unmodified, already-shipped code from Phase 3, not
new.

## What remains OUT of scope (unchanged from the approved plan)

`/admin/universities` & `/admin/domains` CRUD, the Reports system, a Moderation Logs viewer, an
admin-wide analytics dashboard — all real, explicitly-deferred gaps, good candidates for future
phases.
