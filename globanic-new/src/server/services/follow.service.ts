import { prisma } from "@/lib/prisma";
import { NotFoundError, ValidationError } from "./resource.service";
import { createNotification } from "./notification.service";
import { toAdvisoryLockKey } from "@/lib/utils/advisory-lock";

type Actor = { id: string };

export type FollowState = { following: boolean };

/**
 * Sets the follow relationship to an *explicit* desired state, rather than
 * blindly toggling — this is the key idempotency decision for Phase 11's
 * reliability requirement:
 *
 *  - Calling `setAuthorFollowState(actor, authorId, true)` twice in a row
 *    (e.g. a retried request) only ever creates one Follow row and one
 *    NEW_FOLLOWER notification — the second call finds the row already
 *    exists and is a true no-op, not a second "follow" event.
 *  - Calling it with `false` removes the relationship (no notification —
 *    there is no "unfollowed" notification type, by design).
 *  - Calling it with `true` again *after* an actual removal is correctly
 *    treated as a new follow event and does create a new notification —
 *    this is the explicit "unfollow -> follow again is legitimate"
 *    carve-out, satisfied naturally because the row genuinely doesn't
 *    exist at that point.
 *
 * The advisory lock (same `toAdvisoryLockKey` utility as the Analytics
 * Hardening pass and moderation.service.ts) closes the remaining race: two
 * concurrent requests with the same intent could otherwise both read "row
 * doesn't exist yet" before either commits, and both create a row/notify.
 * `@@unique([followerId, authorId])` would catch the double-insert as a DB
 * constraint violation without the lock, but only after already having
 * attempted a duplicate notification — the lock prevents that attempt
 * from happening at all by serializing the two calls.
 */
export async function setAuthorFollowState(
  actor: Actor,
  authorId: string,
  follow: boolean,
): Promise<FollowState> {
  const author = await prisma.author.findUnique({
    where: { id: authorId },
    include: { userLink: true },
  });
  if (!author) throw new NotFoundError();

  if (author.userLink?.userId === actor.id) {
    throw new ValidationError("لا يمكنك متابعة نفسك.");
  }

  const lockKey = toAdvisoryLockKey(`follow:${actor.id}:${authorId}`);

  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${lockKey})`;

    const existing = await tx.follow.findUnique({
      where: { followerId_authorId: { followerId: actor.id, authorId } },
    });

    if (follow) {
      if (existing) {
        // Same intent, already satisfied — idempotent no-op, no new
        // Follow row, no new notification.
        return { following: true };
      }

      await tx.follow.create({ data: { followerId: actor.id, authorId } });

      if (author.userLink) {
        await createNotification(tx, {
          userId: author.userLink.userId,
          type: "NEW_FOLLOWER",
          title: "متابع جديد",
          message: "لديك متابع جديد على Globanic.",
          link: `/authors/${author.slug}`,
        });
      }

      return { following: true };
    }

    if (!existing) {
      // Already not following — idempotent no-op.
      return { following: false };
    }

    await tx.follow.delete({ where: { id: existing.id } });
    return { following: false };
  });
}

export async function isFollowingAuthor(actor: Actor | null, authorId: string): Promise<boolean> {
  if (!actor) return false;
  const existing = await prisma.follow.findUnique({
    where: { followerId_authorId: { followerId: actor.id, authorId } },
  });
  return !!existing;
}

/**
 * Phase 18 (Account Self-Service): the user's own followed authors, for
 * /account/following. Read-only, always scoped to `actor.id` — no path
 * to another user's follow list exists here.
 *
 * Selects the same author fields `listAuthors` (public-directory.service.ts)
 * already selects, including the same join-and-count-in-JS technique for
 * "published resource count" (Author -> Resource is many-to-many through
 * ResourceAuthor, so a `status`-filtered count can't be expressed as a
 * plain Prisma `_count` — same reasoning already documented there).
 */
export async function listFollowedAuthors(
  actor: Actor,
  params: { take?: number; skip?: number },
) {
  const { take = 20, skip = 0 } = params;

  const rows = await prisma.follow.findMany({
    where: { followerId: actor.id },
    orderBy: { createdAt: "desc" },
    take: take + 1,
    skip,
    select: {
      author: {
        select: {
          id: true,
          slug: true,
          fullName: true,
          avatarUrl: true,
          verified: true,
          university: { select: { name: true, slug: true } },
          resources: {
            where: { resource: { status: "PUBLISHED" } },
            select: { resourceId: true },
          },
        },
      },
    },
  });

  const hasMore = rows.length > take;
  const following = (hasMore ? rows.slice(0, take) : rows).map(({ author }) => {
    const { resources, ...rest } = author;
    return { ...rest, publishedResourceCount: resources.length };
  });

  return { following, hasMore };
}
