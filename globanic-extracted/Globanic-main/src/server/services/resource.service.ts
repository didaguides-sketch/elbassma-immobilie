import { prisma } from "@/lib/prisma";
import { slugify, resolveUniqueSlug } from "@/lib/utils/slug";
import { getStorageProvider } from "@/server/storage";
import {
  can,
  requireRole,
  ForbiddenError,
  type Role,
} from "@/server/auth/rbac";
import type { ResourceMetadataInput, UpdateResourceInput } from "@/lib/validation/resource.schema";
import type { Resource, ResourceStatus } from "@prisma/client";

export class NotFoundError extends Error {
  constructor(message = "NOT_FOUND") {
    super(message);
    this.name = "NotFoundError";
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

type Actor = { id: string; role: Role };

// Statuses a PUBLISHER is allowed to edit or delete their own resource in.
// Once it leaves DRAFT/CHANGES_REQUESTED, edits must go through moderation.
const PUBLISHER_EDITABLE_STATUSES: ResourceStatus[] = ["DRAFT", "CHANGES_REQUESTED"];
const PUBLISHER_DELETABLE_STATUSES: ResourceStatus[] = ["DRAFT"];

// ------------------------------------------------------------
// Author resolution (Author is independent from User — see schema)
// ------------------------------------------------------------

async function findOrCreateAuthorByName(fullName: string) {
  const trimmed = fullName.trim();

  const existing = await prisma.author.findFirst({
    where: { fullName: { equals: trimmed, mode: "insensitive" } },
  });
  if (existing) return existing;

  const baseSlug = slugify(trimmed);
  const slug = await resolveUniqueSlug(baseSlug, async (candidate) => {
    const found = await prisma.author.findUnique({ where: { slug: candidate } });
    return !!found;
  });

  return prisma.author.create({
    data: { fullName: trimmed, slug },
  });
}

// ------------------------------------------------------------
// Foreign-key existence / consistency checks
// ------------------------------------------------------------

async function assertTaxonomyConsistency(input: {
  domainId: string;
  specialtyId?: string;
  universityId?: string;
  facultyId?: string;
}) {
  const domain = await prisma.domain.findUnique({ where: { id: input.domainId } });
  if (!domain) throw new ValidationError("المجال المحدد غير موجود.");

  if (input.specialtyId) {
    const specialty = await prisma.specialty.findUnique({ where: { id: input.specialtyId } });
    if (!specialty) throw new ValidationError("التخصص المحدد غير موجود.");
    if (specialty.domainId !== input.domainId) {
      throw new ValidationError("التخصص المحدد لا ينتمي إلى المجال المختار.");
    }
  }

  if (input.universityId) {
    const university = await prisma.university.findUnique({ where: { id: input.universityId } });
    if (!university) throw new ValidationError("الجامعة المحددة غير موجودة.");
  }

  if (input.facultyId) {
    const faculty = await prisma.faculty.findUnique({ where: { id: input.facultyId } });
    if (!faculty) throw new ValidationError("الكلية المحددة غير موجودة.");
    if (input.universityId && faculty.universityId !== input.universityId) {
      throw new ValidationError("الكلية المحددة لا تنتمي إلى الجامعة المختارة.");
    }
  }
}

// ------------------------------------------------------------
// CREATE
// ------------------------------------------------------------

export async function createResource(
  actor: Actor,
  input: ResourceMetadataInput,
): Promise<Resource> {
  requireRole(actor.role, ["PUBLISHER", "ADMIN", "SUPER_ADMIN"]);
  if (!can(actor.role, "resource:create") && !can(actor.role, "resource:edit-any")) {
    throw new ForbiddenError();
  }

  await assertTaxonomyConsistency(input);

  const author = await findOrCreateAuthorByName(input.authorName);

  const baseSlug = slugify(input.title);
  const slug = await resolveUniqueSlug(baseSlug, async (candidate) => {
    const found = await prisma.resource.findUnique({
      where: { type_slug: { type: input.type, slug: candidate } },
    });
    return !!found;
  });

  const resource = await prisma.resource.create({
    data: {
      title: input.title,
      slug,
      type: input.type,
      abstract: input.abstract,
      description: input.description,
      keywords: input.keywords,
      level: input.level,
      year: input.year,
      language: input.language,
      status: "DRAFT",
      domainId: input.domainId,
      specialtyId: input.specialtyId,
      universityId: input.universityId,
      facultyId: input.facultyId,
      uploadedById: actor.id,
      authors: {
        create: [{ authorId: author.id, order: 0 }],
      },
    },
  });

  return resource;
}

// ------------------------------------------------------------
// READ
// ------------------------------------------------------------

const ownerResourceInclude = {
  domain: true,
  specialty: true,
  university: true,
  faculty: true,
  authors: { include: { author: true }, orderBy: { order: "asc" as const } },
  versions: { orderBy: { versionNumber: "desc" as const }, include: { file: true } },
};

export async function getResourceForActor(actor: Actor, resourceId: string) {
  const resource = await prisma.resource.findUnique({
    where: { id: resourceId },
    include: ownerResourceInclude,
  });

  if (!resource) throw new NotFoundError();

  const isOwner = resource.uploadedById === actor.id;
  const canViewAny = can(actor.role, "resource:view-any");

  if (!isOwner && !canViewAny) {
    throw new ForbiddenError();
  }

  return resource;
}

export type PublisherResourceTab =
  | "all"
  | "published"
  | "pending" // SUBMITTED + UNDER_REVIEW
  | "draft"
  | "rejected"
  | "changes_requested";

const TAB_STATUS_MAP: Record<PublisherResourceTab, ResourceStatus[] | undefined> = {
  all: undefined,
  published: ["PUBLISHED"],
  pending: ["SUBMITTED", "UNDER_REVIEW"],
  draft: ["DRAFT"],
  rejected: ["REJECTED"],
  changes_requested: ["CHANGES_REQUESTED"],
};

export async function listPublisherResources(actor: Actor, tab: PublisherResourceTab = "all") {
  requireRole(actor.role, ["PUBLISHER", "ADMIN", "SUPER_ADMIN"]);

  const statusFilter = TAB_STATUS_MAP[tab];

  return prisma.resource.findMany({
    where: {
      uploadedById: actor.id,
      ...(statusFilter ? { status: { in: statusFilter } } : {}),
    },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      slug: true,
      type: true,
      status: true,
      viewsCount: true,
      downloadsCount: true,
      updatedAt: true,
    },
  });
}

/**
 * Admin listing — foundation only (per Phase 4 scope). Full filtering/
 * pagination/UI for /admin/resources is built out in the moderation phase.
 */
export async function listResourcesForAdmin(actor: Actor, status?: ResourceStatus) {
  requireRole(actor.role, ["ADMIN", "SUPER_ADMIN"]);

  return prisma.resource.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      title: true,
      slug: true,
      type: true,
      status: true,
      createdAt: true,
      uploadedBy: { select: { id: true, email: true } },
    },
  });
}

// ------------------------------------------------------------
// UPDATE
// ------------------------------------------------------------

export async function updateResource(
  actor: Actor,
  resourceId: string,
  input: UpdateResourceInput,
): Promise<Resource> {
  const existing = await prisma.resource.findUnique({ where: { id: resourceId } });
  if (!existing) throw new NotFoundError();

  const isOwner = existing.uploadedById === actor.id;

  if (isOwner && actor.role === "PUBLISHER") {
    if (!PUBLISHER_EDITABLE_STATUSES.includes(existing.status)) {
      throw new ForbiddenError(
        "لا يمكن تعديل المورد في حالته الحالية — فقط في وضع مسودة أو بعد طلب تعديلات.",
      );
    }
  } else if (!can(actor.role, "resource:edit-any")) {
    throw new ForbiddenError();
  }

  if (input.domainId) {
    await assertTaxonomyConsistency({
      domainId: input.domainId,
      specialtyId: input.specialtyId,
      universityId: input.universityId,
      facultyId: input.facultyId,
    });
  }

  let author: { id: string } | undefined;
  if (input.authorName) {
    author = await findOrCreateAuthorByName(input.authorName);
  }

  // Slug is only ever regenerated while the resource is still a DRAFT —
  // once submitted, its URL must stay stable even if the title changes
  // slightly during a "changes requested" round.
  let slug = existing.slug;
  if (input.title && input.title !== existing.title && existing.status === "DRAFT") {
    const baseSlug = slugify(input.title);
    slug = await resolveUniqueSlug(baseSlug, async (candidate) => {
      if (candidate === existing.slug) return false;
      const found = await prisma.resource.findUnique({
        where: { type_slug: { type: existing.type, slug: candidate } },
      });
      return !!found;
    });
  }

  return prisma.resource.update({
    where: { id: resourceId },
    data: {
      title: input.title ?? existing.title,
      slug,
      abstract: input.abstract,
      description: input.description,
      keywords: input.keywords,
      level: input.level,
      year: input.year,
      language: input.language,
      domainId: input.domainId ?? existing.domainId,
      specialtyId: input.specialtyId,
      universityId: input.universityId,
      facultyId: input.facultyId,
      ...(author
        ? {
            authors: {
              deleteMany: {},
              create: [{ authorId: author.id, order: 0 }],
            },
          }
        : {}),
    },
  });
}

// ------------------------------------------------------------
// SUBMIT FOR REVIEW
// ------------------------------------------------------------

export async function submitResourceForReview(actor: Actor, resourceId: string) {
  requireRole(actor.role, ["PUBLISHER", "ADMIN", "SUPER_ADMIN"]);

  const existing = await prisma.resource.findUnique({ where: { id: resourceId } });
  if (!existing) throw new NotFoundError();

  const isOwner = existing.uploadedById === actor.id;
  if (!isOwner && !can(actor.role, "resource:edit-any")) {
    throw new ForbiddenError();
  }

  if (!["DRAFT", "CHANGES_REQUESTED"].includes(existing.status)) {
    throw new ValidationError("لا يمكن إرسال هذا المورد للمراجعة في حالته الحالية.");
  }

  if (!existing.domainId) {
    throw new ValidationError("لا يمكن إرسال المورد للمراجعة بدون تحديد المجال.");
  }

  const versionCount = await prisma.resourceVersion.count({ where: { resourceId } });
  if (versionCount === 0) {
    throw new ValidationError("لا يمكن إرسال المورد للمراجعة قبل رفع ملف (PDF) واحد على الأقل.");
  }

  const [resource] = await prisma.$transaction([
    prisma.resource.update({
      where: { id: resourceId },
      data: { status: "SUBMITTED", rejectionReason: null },
    }),
    prisma.moderationLog.create({
      data: {
        actorId: actor.id,
        resourceId,
        action: "SUBMIT",
      },
    }),
  ]);

  return resource;
}

// ------------------------------------------------------------
// DELETE
// ------------------------------------------------------------

export async function deleteResource(actor: Actor, resourceId: string): Promise<void> {
  const existing = await prisma.resource.findUnique({
    where: { id: resourceId },
    include: { versions: { include: { file: true } } },
  });
  if (!existing) throw new NotFoundError();

  const isOwner = existing.uploadedById === actor.id;

  if (isOwner && actor.role === "PUBLISHER") {
    if (!PUBLISHER_DELETABLE_STATUSES.includes(existing.status)) {
      throw new ForbiddenError("لا يمكن حذف مورد بعد إرساله للمراجعة — يمكن حذف المسودات فقط.");
    }
  } else if (!can(actor.role, "resource:delete-any")) {
    throw new ForbiddenError();
  }

  // Collect every storage object tied to this resource before the DB rows
  // (and their storageKey values) are gone.
  const storageKeysToDelete = [
    ...(existing.coverImageKey ? [existing.coverImageKey] : []),
    ...existing.versions.map((v) => v.file?.storageKey).filter((k): k is string => !!k),
  ];

  await prisma.$transaction([
    prisma.resource.delete({ where: { id: resourceId } }),
    prisma.moderationLog.create({
      data: {
        actorId: actor.id,
        // resourceId intentionally omitted: the resource row is gone, and
        // moderationLogs.resourceId has no onDelete: Cascade — keeping the
        // relation would either dangle or block the delete. The audit
        // entry still records who deleted what, in `reason`.
        action: "DELETE",
        reason: `Resource "${existing.title}" (${existing.id}) deleted`,
      },
    }),
  ]);

  // Best-effort cleanup: the DB is already consistent at this point (the
  // resource is gone) regardless of whether these storage deletes succeed.
  // A failure here leaves an orphaned object, not an orphaned DB row — log
  // and move on rather than throwing after the fact.
  if (storageKeysToDelete.length > 0) {
    const storage = await getStorageProvider();
    await Promise.allSettled(
      storageKeysToDelete.map((key) =>
        storage.delete(key).catch((err) => {
          // eslint-disable-next-line no-console
          console.error(`[resource.service] failed to delete storage object "${key}":`, err);
        }),
      ),
    );
  }
}
