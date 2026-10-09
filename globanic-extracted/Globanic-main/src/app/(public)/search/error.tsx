"use client";

import { useTranslations } from "@/components/i18n/I18nProvider";

export default function SearchError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  // Deliberately does NOT render error.message or any stack trace —
  // per the brief's "do not expose internal server errors" requirement.
  // Next.js's error.digest (if present) is safe to show: it's an opaque
  // reference id for server logs, not the error content itself.
  const t = useTranslations("search");
  const tCommon = useTranslations("common");

  return (
    <div className="container-page py-16 text-center">
      <p className="mb-2 text-h4 font-semibold text-globanic-navy">{t("searchFailedTitle")}</p>
      <p className="mx-auto mb-6 max-w-md text-body-sm text-slate-500">{t("searchFailedBody")}</p>
      <button
        onClick={reset}
        className="rounded bg-globanic-navy px-5 py-2.5 text-body-sm font-semibold text-white hover:bg-globanic-navyDeep"
      >
        {tCommon("retry")}
      </button>
    </div>
  );
}
