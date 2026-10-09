import Link from "next/link";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";

export default async function AuthorNotFound() {
  const dict = await getDictionary(await getLocale());
  return (
    <div className="container-page py-20 text-center">
      <p className="mb-2 text-h2 font-semibold text-globanic-navy">{dict.author.notFoundTitle}</p>
      <p className="mx-auto mb-6 max-w-md text-body text-slate-500">
        {dict.author.notFoundBody}
      </p>
      <Link href="/authors" className="rounded bg-globanic-navy px-5 py-2.5 text-body-sm font-semibold text-white hover:bg-globanic-navyDeep">
        {dict.author.browseCta}
      </Link>
    </div>
  );
}
