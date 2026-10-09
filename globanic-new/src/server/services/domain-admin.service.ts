import { prisma } from "@/lib/prisma";
import { requirePermission, type Role } from "@/server/auth/rbac";
import { NotFoundError, ValidationError } from "./resource.service";
import { slugify, resolveUniqueSlug } from "@/lib/utils/slug";
import { diffFields } from "@/lib/utils/diff-fields";
import type { DomainInput } from "@/lib/validation/domain.schema";

type Actor = { id: string; role: Role };

// ------------------------------------------------------------
// READ
// ------------------------------------------------------------

export async function listDomainsForAdmin(actor: Actor) {
  requirePermission(actor.role, "domain:manage");

  return prisma.domain.findMany({
    orderBy: { order: "asc" },
    include: {
      _count: { select: { resources: true, specialties: true } },
    },
  });
}

export async function getDomainForAdmin(actor: Actor, id: string) {
  requirePermission(actor.role, "domain:manage");

  const domain = await prisma.domain.findUnique({ where: { id } });
  if (!domain) throw new NotFoundError();
  return domain;
}

// ------------------------------------------------------------
// CREATE
// ------------------------------------------------------------

async function nextDefaultOrder(): Promise<number> {
  const last = await prisma.domain.findFirst({ orderBy: { order: "desc" }, select: { order: true } });
  return (last?.order ?? -1) + 1;
}

export async function createDomain(actor: Actor, input: DomainInput) {
  requirePermission(actor.role, "domain:manage");

  // Slug is generated once, here, from the name at creation time — never
  // accepted from the client, never regenerated later (see updateDomain).
  const baseSlug = slugify(input.name);
  const slug = await resolveUniqueSlug(baseSlug, async (candidate) => {
    const found = await prisma.domain.findUnique({ where: { slug: candidate } });
    return !!found;
  });

  const order = input.order ?? (await nextDefaultOrder());

  return prisma.$transaction(async (tx) => {
    const domain = await tx.domain.create({
      data: { name: input.name, slug, icon: input.icon ?? null, order },
    });

    await tx.moderationLog.create({
      data: {
        actorId: actor.id,
        action: "CREATE_DOMAIN",
        reason: `Domain "${domain.name}" (${domain.id}) created`,
      },
    });

    return domain;
  });
}

// ------------------------------------------------------------
// UPDATE (slug frozen — never touched here)
// ------------------------------------------------------------

export async function updateDomain(actor: Actor, id: string, input: DomainInput) {
  requirePermission(actor.role, "domain:manage");

  const existing = await prisma.domain.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError();

  const data = {
    name: input.name,
    icon: input.icon ?? null,
    order: input.order ?? existing.order,
  };

  // Idempotent: a save that changes nothing is a no-op, not a new audit
  // entry — same discipline as updateUniversity above.
  const changes = diffFields(existing, data);
  if (!changes) return existing;

  return prisma.$transaction(async (tx) => {
    const updated = await tx.domain.update({ where: { id }, data });

    await tx.moderationLog.create({
      data: {
        actorId: actor.id,
        action: "UPDATE_DOMAIN",
        reason: `Domain "${existing.name}" (${id}) updated — ${changes}`,
      },
    });

    return updated;
  });
}

// ------------------------------------------------------------
// DELETE (blocked when any dependent record exists)
// ------------------------------------------------------------

export async function deleteDomain(actor: Actor, id: string): Promise<void> {
  requirePermission(actor.role, "domain:manage");

  const existing = await prisma.domain.findUnique({
    where: { id },
    include: { _count: { select: { resources: true, specialties: true } } },
  });
  if (!existing) throw new NotFoundError();

  // Deliberate safety rule (approved Phase 16 plan): Specialty.domain
  // uses onDelete: Cascade, so deleting a Domain with specialties still
  // attached would silently wipe them. Resource.domainId is SetNull, so
  // it wouldn't hard-block — but silently detaching every resource in
  // this domain from its classification is just as much a surprise.
  // Block the delete whenever either dependent exists.
  const dependents: string[] = [];
  if (existing._count.resources > 0) dependents.push(`${existing._count.resources} مورد`);
  if (existing._count.specialties > 0) dependents.push(`${existing._count.specialties} تخصص`);

  if (dependents.length > 0) {
    throw new ValidationError(
      `لا يمكن حذف هذا المجال — لا يزال مرتبطًا بـ: ${dependents.join("، ")}. أزل هذه الارتباطات أولًا.`,
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.domain.delete({ where: { id } });

    await tx.moderationLog.create({
      data: {
        actorId: actor.id,
        action: "DELETE_DOMAIN",
        reason: `Domain "${existing.name}" (${id}) deleted`,
      },
    });
  });
}
