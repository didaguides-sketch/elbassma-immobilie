"use client";

import { useEffect } from "react";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto max-w-2xl px-4 py-16 text-center">
      <h1 className="mb-2 text-xl font-bold text-globanic-navy">حدث خطأ غير متوقع</h1>
      <p className="mb-6 text-gray-600">تعذر تحميل هذه الصفحة. حاول مرة أخرى.</p>
      <button
        onClick={reset}
        className="rounded-lg bg-globanic-blue px-5 py-2.5 font-semibold text-white"
      >
        إعادة المحاولة
      </button>
    </main>
  );
}
