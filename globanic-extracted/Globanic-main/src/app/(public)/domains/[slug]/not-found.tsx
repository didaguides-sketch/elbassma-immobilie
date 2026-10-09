import Link from "next/link";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";

export default async function DomainNotFound() {
  const dict = await getDictionary(await getLocale());
  return (
    <div className="container-page py-20 text-center">
      <p className="mb-2 text-h2 font-semibold text-globanic-navy">{dict.domain.notFoundTitle}</p>
      <p className="mx-auto mb-6 max-w-md text-body text-slate-500">
        {dict.domain.notFoundBody}
      </p>
      <Link href="/domains" className="rounded bg-globanic-navy px-5 py-2.5 text-body-sm font-semibold text-white hover:bg-globanic-navyDeep">
        {dict.domain.browseCta}
      </Link>
    </div>
  );
}
