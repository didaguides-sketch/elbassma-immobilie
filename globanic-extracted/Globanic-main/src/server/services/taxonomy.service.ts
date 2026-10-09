import { prisma } from "@/lib/prisma";

export async function listDomainsWithSpecialties() {
  return prisma.domain.findMany({
    orderBy: { order: "asc" },
    include: { specialties: { orderBy: { order: "asc" } } },
  });
}

/**
 * Domain name search for Phase 4 — the Domain table is small and fully
 * enumerable (already listed in full on /domains and the homepage), so
 * this is a plain `contains` filter, not new infrastructure.
 */
export async function searchDomains(q: string, take = 6) {
  const trimmed = q.trim();
  if (!trimmed) return [];
  return prisma.domain.findMany({
    where: { name: { contains: trimmed, mode: "insensitive" } },
    orderBy: { order: "asc" },
    take,
    select: { id: true, slug: true, name: true, _count: { select: { resources: { where: { status: "PUBLISHED" } } } } },
  });
}

export async function listUniversitiesWithFaculties() {
  return prisma.university.findMany({
    orderBy: { name: "asc" },
    include: { faculties: { orderBy: { name: "asc" } } },
  });
}

export type DomainWithSpecialties = Awaited<ReturnType<typeof listDomainsWithSpecialties>>[number];
export type UniversityWithFaculties = Awaited<
  ReturnType<typeof listUniversitiesWithFaculties>
>[number];
