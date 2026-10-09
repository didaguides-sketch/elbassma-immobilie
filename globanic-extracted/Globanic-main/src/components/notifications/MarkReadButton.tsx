"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { markNotificationReadAction } from "@/server/actions/notification.actions";
import { useTranslations } from "@/components/i18n/I18nProvider";

export function MarkReadButton({ notificationId }: { notificationId: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const t = useTranslations("notifications");

  function handleClick() {
    startTransition(async () => {
      const result = await markNotificationReadAction(notificationId);
      if (result.success) router.refresh();
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={pending}
      className="text-xs font-semibold text-globanic-blue hover:underline disabled:opacity-60"
    >
      {pending ? "..." : t("markAsReadButton")}
    </button>
  );
}
