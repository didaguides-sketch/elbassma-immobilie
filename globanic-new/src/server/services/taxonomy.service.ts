import { prisma } from "@/lib/prisma";

export async function listDomainsWithSpecialties() {
  return prisma.domain.findMany({
    orderBy: { order: "asc" },
    include: { specialties: { orderBy: { order: "asc" } } },
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
