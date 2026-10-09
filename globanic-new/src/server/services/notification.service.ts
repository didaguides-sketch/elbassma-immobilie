import { prisma } from "@/lib/prisma";
import { ForbiddenError } from "@/server/auth/rbac";
import { NotFoundError } from "./resource.service";
import type { NotificationType, Prisma } from "@prisma/client";

type Actor = { id: string };

export type CreateNotificationInput = {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
};

/**
 * Takes a Prisma transaction client, not the top-level `prisma` client —
 * every caller (moderation.service.ts, follow.service.ts) creates a
 * notification as part of the same transaction as the event that
 * triggered it, so a failure after this point rolls the notification back
 * too. There is no standalone "just create a notification" path outside
 * a transaction, by design — notifications should never exist for an
 * event that didn't actually happen.
 */
export async function createNotification(
  tx: Prisma.TransactionClient,
  input: CreateNotificationInput,
) {
  return tx.notification.create({ data: input });
}

export async function listMyNotifications(actor: Actor) {
  return prisma.notification.findMany({
    where: { userId: actor.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function getUnreadNotificationCount(actor: Actor): Promise<number> {
  return prisma.notification.count({ where: { userId: actor.id, read: false } });
}

export async function markNotificationAsRead(actor: Actor, notificationId: string) {
  const notification = await prisma.notification.findUnique({ where: { id: notificationId } });
  if (!notification) throw new NotFoundError();
  if (notification.userId !== actor.id) throw new ForbiddenError();

  // Idempotent: marking an already-read notification as read again is a
  // safe no-op, not an error.
  if (notification.read) return notification;

  return prisma.notification.update({
    where: { id: notificationId },
    data: { read: true },
  });
}

export async function markAllNotificationsAsRead(actor: Actor): Promise<void> {
  await prisma.notification.updateMany({
    where: { userId: actor.id, read: false },
    data: { read: true },
  });
}
