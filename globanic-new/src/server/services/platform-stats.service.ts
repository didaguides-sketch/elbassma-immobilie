import { prisma } from "@/lib/prisma";

export type PlatformStats = {
  totalPublishedResources: number;
  totalUniversities: number;
  totalAuthors: number;
  totalUsers: number;
};

/**
 * The 4 real numbers shown in the homepage's "Globanic en chiffres"
 * section. Deliberately narrow — this is not a general admin analytics
 * service; a platform-wide admin dashboard (different audience, different
 * phase) would live elsewhere and likely need far more than these 4 counts.
 */
export async function getPlatformStats(): Promise<PlatformStats> {
  const [totalPublishedResources, totalUniversities, totalAuthors, totalUsers] =
    await Promise.all([
      prisma.resource.count({ where: { status: "PUBLISHED" } }),
      prisma.university.count(),
      prisma.author.count(),
      prisma.user.count(),
    ]);

  return { totalPublishedResources, totalUniversities, totalAuthors, totalUsers };
}
