import Link from "next/link";
import type { ResourceType } from "@prisma/client";
import { resourceTypeToUrlSegment } from "@/lib/utils/resource-type";

const TYPE_LABELS: Record<string, string> = {
  COURS: "Cours",
  MEMOIRE: "Mémoire",
  ARTICLE: "Article",
  THESE: "Thèse",
  LIVRE: "Livre",
};

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

export function ResourceCard({ resource }: { resource: ResourceCardData }) {
  const href = `/resources/${resourceTypeToUrlSegment(resource.type)}/${resource.slug}`;

  return (
    <Link
      href={href}
      className="block rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition hover:shadow-md"
    >
      <span className="mb-2 inline-block rounded-full bg-globanic-blue/10 px-3 py-1 text-xs font-semibold text-globanic-blue">
        {TYPE_LABELS[resource.type]}
      </span>
      <h3 className="mb-1 font-semibold text-globanic-navy">{resource.title}</h3>
      <p className="mb-2 text-xs text-gray-500">
        {resource.authors.map((a) => a.author.fullName).join(", ")}
        {resource.university && ` · ${resource.university.name}`}
      </p>
      <p className="mb-3 text-xs text-gray-400">
        {resource.level && <span>{resource.level}</span>}
        {resource.level && resource.year && <span> · </span>}
        {resource.year && <span>{resource.year}</span>}
      </p>
      <div className="flex gap-3 text-xs text-gray-500">
        <span>{resource.viewsCount} مشاهدة</span>
        <span>{resource.downloadsCount} تحميل</span>
      </div>
    </Link>
  );
}
