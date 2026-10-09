import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-16 text-center">
      <h1 className="mb-2 text-xl font-bold text-globanic-navy">الصفحة غير موجودة</h1>
      <p className="mb-6 text-gray-600">تعذر العثور على هذه الصفحة. ربما تغيّر الرابط أو لم يعد متاحًا.</p>
      <Link
        href="/"
        className="inline-block rounded-lg bg-globanic-blue px-5 py-2.5 font-semibold text-white"
      >
        العودة إلى الصفحة الرئيسية
      </Link>
    </main>
  );
}
