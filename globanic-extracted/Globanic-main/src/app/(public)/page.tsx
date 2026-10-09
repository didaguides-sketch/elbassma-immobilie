import type { Metadata } from "next";
import Link from "next/link";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { listPublishedResources } from "@/server/services/public-resource.service";
import {
  listDomainsWithResourceCounts,
  listTopUniversitiesByResourceCount,
  listAuthors,
} from "@/server/services/public-directory.service";
import { getPlatformStats } from "@/server/services/platform-stats.service";
import { ResourceCard } from "@/components/resources/ResourceCard";
import { GlobalSearchBox } from "@/components/layout/GlobalSearchBox";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import type { Dictionary } from "@/lib/i18n/get-dictionary";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary(await getLocale());
  return buildPageMetadata({
    description: dict.homepage.metaDescription,
    path: "/",
  });
}

const TYPE_SHORTCUTS: { segment: string; typeKey: keyof Dictionary["resourceType"] }[] = [
  { segment: "cours", typeKey: "COURS" },
  { segment: "memoires", typeKey: "MEMOIRE" },
  { segment: "articles", typeKey: "ARTICLE" },
  { segment: "theses", typeKey: "THESE" },
  { segment: "livres", typeKey: "LIVRE" },
];

function formatCount(n: number): string {
  if (n >= 1000) return `${Math.floor(n / 1000)}${n % 1000 >= 100 ? "." + Math.floor((n % 1000) / 100) : ""}k+`;
  return `${n}`;
}

/**
 * "Invalid" logoUrl handling per requirement: reject anything that isn't
 * a well-formed absolute http(s) URL (empty string, whitespace-only,
 * malformed values, or a non-http(s) scheme like `javascript:`/`data:` —
 * defensive against both broken data and a stray XSS vector) — anything
 * that fails falls back to the initials avatar, never a broken image or
 * an unsafe src attribute.
 */
function isValidHttpUrl(value: string | null | undefined): value is string {
  if (!value || !value.trim()) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function buildDiscoveryPaths(dict: Dictionary) {
  return [
    { href: "/universities", label: dict.homepage.discoveryUniversitiesLabel, description: dict.homepage.discoveryUniversitiesDesc },
    { href: "/domains", label: dict.homepage.discoveryDomainsLabel, description: dict.homepage.discoveryDomainsDesc },
    { href: "/resources", label: dict.homepage.discoveryResourcesLabel, description: dict.homepage.discoveryResourcesDesc },
    { href: "/resources/articles", label: dict.homepage.discoveryArticlesLabel, description: dict.homepage.discoveryArticlesDesc },
    { href: "/authors", label: dict.homepage.discoveryAuthorsLabel, description: dict.homepage.discoveryAuthorsDesc },
  ];
}

/**
 * Illustrative structural summary only — NOT a live query against
 * Faculty/Department/Module data (those pages/queries are Phase 6).
 * Only the two ends of the chain that have real routes today
 * (University, Domain) are linked; the rest are plain labels, honestly
 * non-interactive rather than pointing at pages that don't exist yet.
 */
function buildHierarchySteps(dict: Dictionary) {
  return [
    { label: dict.homepage.hierarchyUniversity, href: "/universities" },
    { label: dict.homepage.hierarchyFaculty },
    { label: dict.homepage.hierarchyDepartment },
    { label: dict.homepage.hierarchyModule },
    { label: dict.homepage.hierarchyDomain, href: "/domains" },
    { label: dict.homepage.hierarchyResource, href: "/resources" },
  ];
}

export default async function HomePage() {
  const locale = await getLocale();
  const dict = await getDictionary(locale);
  const DISCOVERY_PATHS = buildDiscoveryPaths(dict);
  const HIERARCHY_STEPS = buildHierarchySteps(dict);

  const [popular, latest, articles, domains, topUniversities, authors, stats] = await Promise.all([
    listPublishedResources({ take: 6, sort: "most_viewed" }),
    listPublishedResources({ take: 3, sort: "recent" }),
    listPublishedResources({ type: "ARTICLE", take: 3, sort: "recent" }),
    listDomainsWithResourceCounts(),
    listTopUniversitiesByResourceCount(4),
    listAuthors({ take: 4 }),
    getPlatformStats(),
  ]);

  return (
    <div className="bg-white">
      {/* ---------- HERO ---------- */}
      <section className="bg-globanic-navyDeep px-4 py-16 text-center text-white sm:py-24">
        <p className="mb-3 text-caption font-semibold uppercase tracking-wider text-globanic-blueLight">
          {dict.homepage.heroEyebrow}
        </p>
        <h1 className="mx-auto mb-4 max-w-2xl text-h1 font-semibold leading-tight sm:text-display">
          {dict.homepage.heroTitle}
        </h1>
        <p className="mx-auto mb-10 max-w-xl text-body-lg text-white/75">
          {dict.homepage.heroSubtitle}
        </p>

        <div className="mx-auto max-w-2xl rounded-md bg-white p-2 shadow-raised">
          <GlobalSearchBox />
        </div>

        <div className="mx-auto mt-5 flex max-w-2xl flex-wrap justify-center gap-2">
          {TYPE_SHORTCUTS.map((t) => (
            <Link
              key={t.segment}
              href={`/resources/${t.segment}`}
              className="rounded border border-white/25 px-4 py-1.5 text-body-sm text-white/85 transition hover:bg-white/10"
            >
              {dict.resourceType[t.typeKey]}
            </Link>
          ))}
        </div>
      </section>

      <div className="container-page">
        {/* ---------- DISCOVERY PATHS ---------- */}
        <section className="border-b border-slate-100 py-12">
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-5">
            {DISCOVERY_PATHS.map((path) => (
              <Link key={path.href} href={path.href} className="group">
                <p className="mb-1 text-body font-semibold text-globanic-navy group-hover:text-globanic-blue">
                  {path.label}
                </p>
                <p className="text-body-sm text-slate-500">{path.description}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* ---------- POPULAR RESOURCES ---------- */}
        <section className="border-b border-slate-100 py-12">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <p className="mb-1 text-caption font-semibold uppercase tracking-wide text-globanic-blue">
                {dict.homepage.popularEyebrow}
              </p>
              <h2 className="text-h3 font-semibold text-globanic-navy">{dict.homepage.popularHeading}</h2>
            </div>
            <Link href="/resources" className="inline-flex items-center gap-1 text-body-sm font-semibold text-globanic-blue hover:underline">
              {dict.search.seeAll}
              <ViewAllArrow />
            </Link>
          </div>

          {popular.resources.length === 0 ? (
            <EmptyBlock message={dict.homepage.noPublishedResourcesMessage} />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {popular.resources.map((r) => (
                <ResourceCard key={r.id} resource={r} />
              ))}
            </div>
          )}
        </section>

        {/* ---------- ACADEMIC DOMAINS ---------- */}
        <section className="border-b border-slate-100 py-12">
          <div className="mb-6">
            <p className="mb-1 text-caption font-semibold uppercase tracking-wide text-globanic-blue">
              {dict.homepage.structureEyebrow}
            </p>
            <h2 className="text-h3 font-semibold text-globanic-navy">{dict.homepage.domainsHeading}</h2>
          </div>

          {domains.length === 0 ? (
            <EmptyBlock message={dict.homepage.noDomainsMessage} />
          ) : (
            <ul className="grid grid-cols-2 divide-y divide-slate-100 border-t border-slate-100 sm:grid-cols-3 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
              {domains.map((d) => (
                <li key={d.id} className="border-slate-100 sm:border-e">
                  <Link href={`/domains/${d.slug}`} className="flex items-center justify-between px-4 py-4 hover:bg-slate-50">
                    <span className="text-body-sm font-medium text-globanic-navy">{d.name}</span>
                    <span className="text-caption text-slate-400">{d._count.resources}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ---------- TOP UNIVERSITIES ---------- */}
        <section className="border-b border-slate-100 py-12">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <p className="mb-1 text-caption font-semibold uppercase tracking-wide text-globanic-blue">
                {dict.homepage.institutionsEyebrow}
              </p>
              <h2 className="text-h3 font-semibold text-globanic-navy">{dict.homepage.universitiesHeading}</h2>
            </div>
            <Link href="/universities" className="inline-flex items-center gap-1 text-body-sm font-semibold text-globanic-blue hover:underline">
              {dict.search.seeAll}
              <ViewAllArrow />
            </Link>
          </div>

          {topUniversities.length === 0 ? (
            <EmptyBlock message={dict.homepage.noUniversitiesMessage} />
          ) : (
            <div className="grid grid-cols-1 divide-y divide-slate-100 border-t border-slate-100 sm:grid-cols-2">
              {topUniversities.map((u) => (
                <Link
                  key={u.id}
                  href={`/universities/${u.slug}`}
                  className="flex items-center gap-4 py-4 sm:odd:pe-6 sm:even:ps-6"
                >
                  {isValidHttpUrl(u.logoUrl) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={u.logoUrl} alt={u.name} className="h-11 w-11 shrink-0 rounded object-contain" />
                  ) : (
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded bg-slate-100 text-body font-semibold text-globanic-navy">
                      {u.name.charAt(0)}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-medium text-globanic-navy">{u.name}</p>
                    <p className="text-body-sm text-slate-500">
                      {[u.city, u.country].filter(Boolean).join(dict.common.listSeparator)} · {u._count.resources} {dict.homepage.resourceCountSuffix}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* ---------- FEATURED ARTICLES ---------- */}
        <section className="border-b border-slate-100 py-12">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <p className="mb-1 text-caption font-semibold uppercase tracking-wide text-globanic-blue">
                {dict.homepage.deepReadingEyebrow}
              </p>
              <h2 className="font-serif text-h3 font-semibold text-globanic-navy">{dict.homepage.articlesHeading}</h2>
            </div>
            <Link href="/resources/articles" className="inline-flex items-center gap-1 text-body-sm font-semibold text-globanic-blue hover:underline">
              {dict.search.seeAll}
              <ViewAllArrow />
            </Link>
          </div>

          {articles.resources.length === 0 ? (
            <EmptyBlock message={dict.homepage.noArticlesMessage} />
          ) : (
            <div className="grid grid-cols-1 gap-8 border-t border-slate-100 pt-8 sm:grid-cols-3">
              {articles.resources.map((a) => (
                <Link key={a.id} href={`/resources/articles/${a.slug}`} className="group block">
                  <h3 className="mb-2 font-serif text-h4 font-medium text-globanic-navy group-hover:text-globanic-blue">
                    {a.title}
                  </h3>
                  <p className="text-body-sm text-slate-500">
                    {a.authors.map((x) => x.author.fullName).join(dict.common.listSeparator) || dict.homepage.noAuthorMentionedLabel}
                    {a.university && ` · ${a.university.name}`}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* ---------- AUTHORS ---------- */}
        <section className="border-b border-slate-100 py-12">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <p className="mb-1 text-caption font-semibold uppercase tracking-wide text-globanic-blue">
                {dict.homepage.behindContentEyebrow}
              </p>
              <h2 className="text-h3 font-semibold text-globanic-navy">{dict.homepage.authorsHeading}</h2>
            </div>
            <Link href="/authors" className="inline-flex items-center gap-1 text-body-sm font-semibold text-globanic-blue hover:underline">
              {dict.search.seeAll}
              <ViewAllArrow />
            </Link>
          </div>

          {authors.authors.length === 0 ? (
            <EmptyBlock message={dict.homepage.noAuthorsMessage} />
          ) : (
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
              {authors.authors.map((author) => (
                <Link key={author.id} href={`/authors/${author.slug}`} className="text-center group">
                  {isValidHttpUrl(author.avatarUrl) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={author.avatarUrl} alt={author.fullName} className="mx-auto mb-2 h-14 w-14 rounded-full object-cover" />
                  ) : (
                    <span className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-body font-semibold text-globanic-navy">
                      {author.fullName.charAt(0)}
                    </span>
                  )}
                  <p className="text-body-sm font-medium text-globanic-navy group-hover:text-globanic-blue">
                    {author.fullName}
                    {/* `verified` is a real Author DB field, not a fabricated badge. */}
                    {author.verified && (
                      <span aria-label={dict.search.verifiedLabel} title={dict.search.verifiedLabel} className="ms-1 text-globanic-blue">
                        ✓
                      </span>
                    )}
                  </p>
                  {author.university && <p className="text-caption text-slate-500">{author.university.name}</p>}
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* ---------- ACADEMIC HIERARCHY ---------- */}
        <section className="border-b border-slate-100 py-14">
          <div className="mb-8 text-center">
            <p className="mb-1 text-caption font-semibold uppercase tracking-wide text-globanic-blue">
              {dict.homepage.structureBadgeEyebrow}
            </p>
            <h2 className="text-h3 font-semibold text-globanic-navy">{dict.homepage.hierarchyHeading}</h2>
            <p className="mx-auto mt-2 max-w-lg text-body-sm text-slate-500">
              {dict.homepage.hierarchyBody}
            </p>
          </div>

          <ol className="mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-x-2 gap-y-3 text-body-sm">
            {HIERARCHY_STEPS.map((step, i) => (
              <li key={step.label} className="flex items-center gap-2">
                {step.href ? (
                  <Link href={step.href} className="rounded border border-slate-200 px-3 py-1.5 font-medium text-globanic-navy hover:border-globanic-blue hover:text-globanic-blue">
                    {step.label}
                  </Link>
                ) : (
                  <span className="rounded px-3 py-1.5 font-medium text-slate-400">{step.label}</span>
                )}
                {i < HIERARCHY_STEPS.length - 1 && (
                  <span aria-hidden="true" className="text-slate-300">
                    <HierarchyArrow />
                  </span>
                )}
              </li>
            ))}
          </ol>
        </section>

        {/* ---------- GLOBANIC BY THE NUMBERS ---------- */}
        <section className="border-b border-slate-100 py-12">
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            <Stat value={stats.totalPublishedResources} label={dict.homepage.statPublishedResource} />
            <Stat value={stats.totalUniversities} label={dict.homepage.statUniversity} />
            <Stat value={stats.totalAuthors} label={dict.homepage.statResearcher} />
            <Stat value={stats.totalUsers} label={dict.homepage.statUser} />
          </div>
        </section>

        {/* ---------- ABOUT / MISSION ---------- */}
        <section className="border-b border-slate-100 py-14 text-center">
          <h2 className="mx-auto mb-3 max-w-xl font-serif text-h3 font-medium text-globanic-navy">
            {dict.homepage.missionHeading}
          </h2>
          <p className="mx-auto max-w-xl text-body text-slate-600">
            {dict.homepage.missionBody}
          </p>
        </section>

        {/* ---------- LATEST RESOURCES ---------- */}
        <section className="py-12">
          <div className="mb-6 flex items-end justify-between">
            <h2 className="text-h3 font-semibold text-globanic-navy">{dict.homepage.latestHeading}</h2>
            <Link href="/resources" className="inline-flex items-center gap-1 text-body-sm font-semibold text-globanic-blue hover:underline">
              {dict.search.seeAll}
              <ViewAllArrow />
            </Link>
          </div>

          {latest.resources.length === 0 ? (
            <EmptyBlock message={dict.homepage.noPublishedResourcesMessage} />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {latest.resources.map((r) => (
                <ResourceCard key={r.id} resource={r} />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* ---------- FINAL DISCOVERY CTA ---------- */}
      <section className="bg-globanic-navyDeep px-4 py-14 text-center text-white">
        <p className="mb-2 text-h3 font-semibold">{dict.homepage.finalCtaHeading}</p>
        <p className="mb-6 text-body text-white/70">{dict.homepage.finalCtaBody}</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/resources" className="rounded bg-white px-6 py-3 font-semibold text-globanic-navy hover:bg-slate-100">
            {dict.homepage.exploreResourcesCta}
          </Link>
          <Link href="/publisher/apply" className="rounded border border-white/30 px-6 py-3 font-semibold text-white hover:bg-white/10">
            {dict.homepage.publishWithUsCta}
          </Link>
        </div>
      </section>
    </div>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="text-center">
      <p className="text-h2 font-semibold text-globanic-navy">{formatCount(value)}</p>
      <p className="text-body-sm text-slate-500">{label}</p>
    </div>
  );
}

function EmptyBlock({ message }: { message: string }) {
  return (
    <div className="rounded border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-body-sm text-slate-500">
      {message}
    </div>
  );
}

/**
 * Direction-aware arrows — NOT a hardcoded "←"/"→" character. Points
 * toward "forward" (end of reading direction) via Tailwind's built-in
 * `rtl:`/`ltr:` variants (based on the ancestor `dir` attribute set in
 * layout.tsx), so this renders correctly the day real LTR locale
 * support exists (English/French/Spanish per the multilingual
 * requirement) without any further change to this file.
 */
function ViewAllArrow() {
  return (
    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="ltr:rotate-180">
      <path d="M19 12H5M11 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function HierarchyArrow() {
  return (
    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="inline-block ltr:rotate-180">
      <path d="M19 12H5M11 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
