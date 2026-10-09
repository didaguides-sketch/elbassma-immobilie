"use client";

import { logoutAction } from "@/server/actions/auth.actions";

export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <button
        type="submit"
        className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-globanic-navy transition hover:bg-gray-50"
      >
        تسجيل الخروج
      </button>
    </form>
  );
}
