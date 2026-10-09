import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/LoginForm";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary(await getLocale());
  return { title: dict.nav.login };
}

export default async function LoginPage() {
  const locale = await getLocale();
  const dict = await getDictionary(locale);

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-100">
        <h1 className="mb-6 text-2xl font-bold text-globanic-navy">{dict.nav.login}</h1>
        <Suspense>
          <LoginForm />
        </Suspense>
        <p className="mt-6 text-center text-sm text-gray-600">
          {dict.auth.noAccountPrompt}{" "}
          <a href="/register" className="font-semibold text-globanic-blue">
            {dict.nav.createAccount}
          </a>
        </p>
      </div>
    </main>
  );
}
