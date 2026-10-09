"use client";

import { logoutAction } from "@/server/actions/auth.actions";
import { useTranslations } from "@/components/i18n/I18nProvider";

export function LogoutButton() {
  const tNav = useTranslations("nav");
  return (
    <form action={logoutAction}>
      <button
        type="submit"
        className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-globanic-navy transition hover:bg-gray-50"
      >
        {tNav("logout")}
      </button>
    </form>
  );
}
