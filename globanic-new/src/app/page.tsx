import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/server/auth/auth.config";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { listPublishedResources } from "@/server/services/public-resource.service";
import {
  listDomainsWithResourceCounts,
  listTopUniversitiesByResourceCount,
} from "@/server/services/public-directory.service";
import { getPlatformStats } from "@/server/services/platform-stats.service";
import { resourceTypeToUrlSegment } from "@/lib/utils/resource-type";
import { ResourceCard } from "@/components/resources/ResourceCard";
import { HomeHeader } from "@/components/layout/HomeHeader";

export const metadata: Metadata = buildPageMetadata({
  description:
    "Globanic — منصة أكاديمية لنشر واكتشاف الكتب، المذكرات، المقالات، الأطروحات والكتب الأكاديمية.",
  path: "/",
});

const TYPE_SHORTCUTS: { segment: string; label: string }[] = [
  { segment: "cours", label: "Cours" },
  { segment: "memoires", label: "Mémoires" },
  { segment: "articles", label: "Articles" },
  { segment: "theses", label: "Thèses" },
  { segment: "livres", label: "Livres" },
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

export default async function HomePage() {
  const session = await auth();

  const [popular, latest, domains, topUniversities, stats] = await Promise.all([
    listPublishedResources({ take: 5, sort: "most_viewed" }),
    listPublishedResources({ take: 3, sort: "recent" }),
    listDomainsWithResourceCounts(),
    listTopUniversitiesByResourceCount(3),
    getPlatformStats(),
  ]);

  const accountArea = session?.user ? (
    <a href="/account" className="block text-sm font-semibold text-globanic-blue">
      حسابي ({session.user.role})
    </a>
  ) : (
    <div className="flex gap-3">
      <a href="/login" className="text-sm font-semibold text-globanic-blue">
        تسجيل الدخول
      </a>
      <a href="/register" className="text-sm font-semibold text-globanic-navy">
        إنشاء حساب
      </a>
    </div>
  );

  return (
    <div className="bg-white">
      <HomeHeader accountArea={accountArea} />

      {/* ---------- HERO ---------- */}
      <section className="bg-globanic-navy px-4 py-14 text-center text-white">
        <p className="mb-2 text-sm font-semibold tracking-wide text-globanic-blueLight">
          PLATEFORME ACADÉMIQUE
        </p>
        <h1 className="mx-auto mb-4 max-w-2xl text-3xl font-extrabold leading-tight sm:text-4xl">
          LA CONNAISSANCE À PORTÉE DE MAIN
        </h1>
        <p className="mx-auto mb-8 max-w-xl text-white/80">
          Cours, mémoires, articles scientifiques et ressources universitaires réunis au même
          endroit pour apprendre, rechercher et évoluer.
        </p>

        <form action="/search" method="get" className="mx-auto max-w-2xl rounded-2xl bg-white p-3 shadow-lg sm:flex sm:gap-3 sm:p-4">
          <input
            type="text"
            name="q"
            placeholder="Titre, cours, mémoire, auteur, mot-clé..."
            className="mb-3 w-full rounded-xl border border-gray-200 px-4 py-3 text-globanic-navy outline-none focus:border-globanic-blue sm:mb-0"
          />
          <button
            type="submit"
            className="w-full rounded-xl bg-globanic-blue px-6 py-3 font-semibold text-white transition hover:bg-globanic-blueLight sm:w-auto"
          >
            Rechercher
          </button>
        </form>

        <div className="mx-auto mt-4 flex max-w-2xl flex-wrap justify-center gap-2">
          {TYPE_SHORTCUTS.map((t) => (
            <Link
              key={t.segment}
              href={`/resources/${t.segment}`}
              className="rounded-full border border-white/30 px-4 py-1.5 text-sm text-white/90 transition hover:bg-white/10"
            >
              {t.label}
            </Link>
          ))}
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4">
        {/* ---------- RESSOURCES POPULAIRES ---------- */}
        <section className="py-10">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-globanic-blue">RESSOURCES À LA UNE</p>
              <h2 className="text-xl font-bold text-globanic-navy">Ressources populaires</h2>
            </div>
            <Link href="/resources" className="text-sm font-semibold text-globanic-blue hover:underline">
              Voir tout →
            </Link>
          </div>

          {popular.resources.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-gray-500">
              لا توجد موارد منشورة بعد.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {popular.resources.map((r) => (
                <ResourceCard key={r.id} resource={r} />
              ))}
            </div>
          )}
        </section>

        {/* ---------- EXPLORER PAR DOMAINE ---------- */}
        <section className="py-10">
          <h2 className="mb-5 text-xl font-bold text-globanic-navy">Explorer par domaine</h2>

          {domains.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-gray-500">
              لا توجد مجالات مسجّلة بعد.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {domains.map((d) => (
                <Link
                  key={d.id}
                  href={`/domains/${d.slug}`}
                  className="flex flex-col items-center gap-2 rounded-xl bg-gray-50 p-5 text-center transition hover:bg-gray-100"
                >
                  <span aria-hidden="true" className="text-globanic-blue">
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15Z" />
                    </svg>
                  </span>
                  <span className="text-sm font-semibold text-globanic-navy">{d.name}</span>
                  <span className="text-xs text-gray-500">{d._count.resources} ressources</span>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* ---------- UNIVERSITÉS POPULAIRES ---------- */}
        <section className="py-10">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-bold text-globanic-navy">Universités populaires</h2>
            <Link href="/universities" className="text-sm font-semibold text-globanic-blue hover:underline">
              Voir toutes →
            </Link>
          </div>

          {topUniversities.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-gray-500">
              لا توجد جامعات مسجّلة بعد.
            </p>
          ) : (
            <div className="space-y-3">
              {topUniversities.map((u) => (
                <Link
                  key={u.id}
                  href={`/universities/${u.slug}`}
                  className="flex items-center gap-4 rounded-xl border border-gray-100 p-4 shadow-sm transition hover:shadow-md"
                >
                  {isValidHttpUrl(u.logoUrl) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={u.logoUrl} alt={u.name} className="h-10 w-10 rounded-lg object-contain" />
                  ) : (
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-globanic-blue/10 text-sm font-bold text-globanic-blue">
                      {u.name.charAt(0)}
                    </span>
                  )}
                  <div>
                    <p className="font-semibold text-globanic-navy">{u.name}</p>
                    <p className="text-xs text-gray-500">
                      {[u.city, u.country].filter(Boolean).join("، ")} · {u._count.resources} ressources
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* ---------- GLOBANIC EN CHIFFRES ---------- */}
        <section className="py-10">
          <h2 className="mb-5 text-xl font-bold text-globanic-navy">Globanic en chiffres</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-xl bg-gray-50 p-5 text-center">
              <p className="text-2xl font-extrabold text-globanic-navy">{formatCount(stats.totalPublishedResources)}</p>
              <p className="text-xs text-gray-500">Ressources</p>
            </div>
            <div className="rounded-xl bg-gray-50 p-5 text-center">
              <p className="text-2xl font-extrabold text-globanic-navy">{formatCount(stats.totalUniversities)}</p>
              <p className="text-xs text-gray-500">Universités</p>
            </div>
            <div className="rounded-xl bg-gray-50 p-5 text-center">
              <p className="text-2xl font-extrabold text-globanic-navy">{formatCount(stats.totalAuthors)}</p>
              <p className="text-xs text-gray-500">Chercheurs</p>
            </div>
            <div className="rounded-xl bg-gray-50 p-5 text-center">
              <p className="text-2xl font-extrabold text-globanic-navy">{formatCount(stats.totalUsers)}</p>
              <p className="text-xs text-gray-500">Utilisateurs</p>
            </div>
          </div>
        </section>

        {/* ---------- CTA PUBLIER ---------- */}
        <section className="py-10">
          <div className="rounded-2xl bg-gradient-to-br from-globanic-blue to-globanic-navy p-8 text-center text-white">
            <p className="mb-2 text-lg font-bold">Vous avez des connaissances à partager ?</p>
            <p className="mb-5 text-sm text-white/80">
              Publiez vos cours, mémoires et travaux de recherche sur Globanic.
            </p>
            <Link
              href="/publisher/apply"
              className="inline-block rounded-lg bg-white px-6 py-3 font-semibold text-globanic-navy hover:bg-gray-100"
            >
              Publier une ressource
            </Link>
          </div>
        </section>

        {/* ---------- DERNIÈRES RESSOURCES ---------- */}
        <section className="py-10">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-bold text-globanic-navy">Dernières ressources</h2>
            <Link href="/resources" className="text-sm font-semibold text-globanic-blue hover:underline">
              Voir tout →
            </Link>
          </div>

          {latest.resources.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-gray-500">
              لا توجد موارد منشورة بعد.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {latest.resources.map((r) => (
                <ResourceCard key={r.id} resource={r} />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* ---------- FOOTER ---------- */}
      <footer className="border-t border-gray-100 bg-gray-50 px-4 py-10 text-center text-sm text-gray-500">
        <p className="mb-3 font-bold text-globanic-navy">Globanic</p>
        <nav className="mb-4 flex flex-wrap justify-center gap-4">
          <Link href="/resources" className="hover:text-globanic-blue">Ressources</Link>
          <Link href="/universities" className="hover:text-globanic-blue">Universités</Link>
          <Link href="/authors" className="hover:text-globanic-blue">Chercheurs</Link>
          <Link href="/domains" className="hover:text-globanic-blue">Domaines</Link>
          <Link href="/publisher/apply" className="hover:text-globanic-blue">Publier</Link>
        </nav>
        <p>© {new Date().getFullYear()} Globanic.</p>
      </footer>
    </div>
  );
}
