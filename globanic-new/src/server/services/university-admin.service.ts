import { prisma } from "@/lib/prisma";
import { requirePermission, type Role } from "@/server/auth/rbac";
import { NotFoundError, ValidationError } from "./resource.service";
import { slugify, resolveUniqueSlug } from "@/lib/utils/slug";
import { diffFields } from "@/lib/utils/diff-fields";
import type { UniversityInput } from "@/lib/validation/university.schema";

type Actor = { id: string; role: Role };

// ------------------------------------------------------------
// READ
// ------------------------------------------------------------

export async function listUniversitiesForAdmin(actor: Actor) {
  requirePermission(actor.role, "university:manage");

  return prisma.university.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: {
          resources: true,
          faculties: true,
          authors: true,
          publisherProfiles: true,
          publisherApplications: true,
        },
      },
    },
  });
}

export async function getUniversityForAdmin(actor: Actor, id: string) {
  requirePermission(actor.role, "university:manage");

  const university = await prisma.university.findUnique({ where: { id } });
  if (!university) throw new NotFoundError();
  return university;
}

// ------------------------------------------------------------
// CREATE
// ------------------------------------------------------------

function toUniversityData(input: UniversityInput) {
  return {
    name: input.name,
    city: input.city ?? null,
    country: input.country ?? null,
    logoUrl: input.logoUrl ?? null,
    officialWebsite: input.officialWebsite ?? null,
  };
}

export async function createUniversity(actor: Actor, input: UniversityInput) {
  requirePermission(actor.role, "university:manage");

  // Slug is generated once, here, from the name at creation time — never
  // accepted from the client, never regenerated later (see updateUniversity).
  const baseSlug = slugify(input.name);
  const slug = await resolveUniqueSlug(baseSlug, async (candidate) => {
    const found = await prisma.university.findUnique({ where: { slug: candidate } });
    return !!found;
  });

  return prisma.$transaction(async (tx) => {
    const university = await tx.university.create({
      data: { ...toUniversityData(input), slug },
    });

    await tx.moderationLog.create({
      data: {
        actorId: actor.id,
        action: "CREATE_UNIVERSITY",
        reason: `University "${university.name}" (${university.id}) created`,
      },
    });

    return university;
  });
}

// ------------------------------------------------------------
// UPDATE (slug frozen — never touched here)
// ------------------------------------------------------------

export async function updateUniversity(actor: Actor, id: string, input: UniversityInput) {
  requirePermission(actor.role, "university:manage");

  const existing = await prisma.university.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError();

  const data = toUniversityData(input);

  // Idempotent: a save that changes nothing is a no-op, not a new audit
  // entry — same discipline as suspendUser/activateUser in
  // user-admin.service.ts.
  const changes = diffFields(existing, data);
  if (!changes) return existing;

  return prisma.$transaction(async (tx) => {
    const updated = await tx.university.update({ where: { id }, data });

    await tx.moderationLog.create({
      data: {
        actorId: actor.id,
        action: "UPDATE_UNIVERSITY",
        reason: `University "${existing.name}" (${id}) updated — ${changes}`,
      },
    });

    return updated;
  });
}

// ------------------------------------------------------------
// DELETE (blocked when any dependent record exists)
// ------------------------------------------------------------

export async function deleteUniversity(actor: Actor, id: string): Promise<void> {
  requirePermission(actor.role, "university:manage");

  const existing = await prisma.university.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          resources: true,
          faculties: true,
          authors: true,
          publisherProfiles: true,
          publisherApplications: true,
        },
      },
    },
  });
  if (!existing) throw new NotFoundError();

  // Deliberate safety rule (approved Phase 16 plan): today's schema is
  // inconsistent about what happens to a University's dependents on
  // delete — Resource/PublisherProfile/PublisherApplication would
  // SetNull, Faculty would silently CASCADE delete, and Author (no
  // onDelete override) would hard-block the delete with a raw FK error.
  // Rather than let an admin hit any of that by surprise, block the
  // delete entirely whenever any dependent exists, with a clear message.
  const dependents: string[] = [];
  if (existing._count.resources > 0) dependents.push(`${existing._count.resources} مورد`);
  if (existing._count.faculties > 0) dependents.push(`${existing._count.faculties} كلية`);
  if (existing._count.authors > 0) dependents.push(`${existing._count.authors} باحث`);
  if (existing._count.publisherProfiles > 0) {
    dependents.push(`${existing._count.publisherProfiles} ملف ناشر`);
  }
  if (existing._count.publisherApplications > 0) {
    dependents.push(`${existing._count.publisherApplications} طلب نشر`);
  }

  if (dependents.length > 0) {
    throw new ValidationError(
      `لا يمكن حذف هذه الجامعة — لا تزال مرتبطة بـ: ${dependents.join("، ")}. أزل هذه الارتباطات أولًا.`,
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.university.delete({ where: { id } });

    await tx.moderationLog.create({
      data: {
        actorId: actor.id,
        action: "DELETE_UNIVERSITY",
        reason: `University "${existing.name}" (${id}) deleted`,
      },
    });
  });
}
