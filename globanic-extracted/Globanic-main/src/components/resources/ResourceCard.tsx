import Link from "next/link";
import type { ResourceType } from "@prisma/client";
import { resourceTypeToUrlSegment } from "@/lib/utils/resource-type";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";

export type ResourceCardData = {
  id: string;
  title: string;
  slug: string;
  type: ResourceType;
  level: string | null;
  year: number | null;
  viewsCount: number;
  downloadsCount: number;
  university: { name: string; slug: string } | null;
  authors: { author: { fullName: string; slug: string } }[];
};

/**
 * Phase 16B, Batch 2: the resource-type badge previously read from a
 * hardcoded, French-only TYPE_LABELS map here — and a SEPARATE,
 * independently-hardcoded French TYPE_LABELS map existed again in
 * resources/[type]/page.tsx, while SearchFilterBar's own <select>
 * options used a third, Arabic-only set of labels for the very same
 * five enum values (with COURS shown as the colloquial "كورس" there,
 * rather than the glossary's "درس"). All three now read from the one
 * shared `resourceType` dictionary namespace instead, resolving that
 * drift in favor of the approved Phase 16B glossary — the underlying
 * `ResourceType` enum values (COURS/MEMOIRE/ARTICLE/THESE/LIVRE) are
 * completely unchanged, only their displayed label is now locale-aware
 * and consistent everywhere.
 *
 * This card is used far beyond public discovery (favorites, homepage,
 * university/author/publisher/domain pages) — none of those pages'
 * OWN remaining text is touched by this batch; only this one shared
 * component's two already-hardcoded strings (view/download counts)
 * and the type badge are localized, which is a safe, content-neutral
 * change wherever this card happens to render.
 */
export async function ResourceCard({ resource }: { resource: ResourceCardData }) {
  const locale = await getLocale();
  const dict = await getDictionary(locale);
  const href = `/resources/${resourceTypeToUrlSegment(resource.type)}/${resource.slug}`;

  return (
    <Link
      href={href}
      className="block rounded border border-slate-200 bg-white p-4 transition hover:border-globanic-blue"
    >
      <span className="mb-2 inline-block rounded bg-globanic-blue/10 px-2 py-0.5 text-caption font-semibold text-globanic-blue">
        {dict.resourceType[resource.type]}
      </span>
      <h3 className="mb-1 font-semibold text-globanic-navy">{resource.title}</h3>
      <p className="mb-2 text-caption text-slate-500">
        {resource.authors.map((a) => a.author.fullName).join(dict.common.listSeparator)}
        {resource.university && ` · ${resource.university.name}`}
      </p>
      <p className="mb-3 text-caption text-slate-400">
        {resource.level && <span>{resource.level}</span>}
        {resource.level && resource.year && <span> · </span>}
        {resource.year && <span>{resource.year}</span>}
      </p>
      <div className="flex gap-3 text-caption text-slate-500">
        <span>
          {resource.viewsCount} {dict.common.viewsSuffix}
        </span>
        <span>
          {resource.downloadsCount} {dict.common.downloadsSuffix}
        </span>
      </div>
    </Link>
  );
}
