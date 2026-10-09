"use client";

import { useEffect } from "react";
import { useTranslations } from "@/components/i18n/I18nProvider";

export default function PublisherError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("account");

  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto max-w-2xl px-4 py-16 text-center">
      <h1 className="mb-2 text-xl font-bold text-globanic-navy">{t("errorTitle")}</h1>
      <p className="mb-6 text-gray-600">{t("errorBody")}</p>
      <button
        onClick={reset}
        className="rounded-lg bg-globanic-blue px-5 py-2.5 font-semibold text-white"
      >
        {t("retryButton")}
      </button>
    </main>
  );
}
