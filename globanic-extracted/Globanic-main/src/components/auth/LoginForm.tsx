"use client";

import { useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { loginSchema } from "@/lib/validation/auth.schema";
import { isSafeRelativePath } from "@/lib/utils/safe-redirect";
import { claimAttributionOnLoginAction } from "@/server/actions/referral.actions";
import { useTranslations } from "@/components/i18n/I18nProvider";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawCallbackUrl = searchParams.get("callbackUrl");
  // Query params are always attacker-controllable — never navigate to one
  // without validating it stays on-site first.
  const callbackUrl = isSafeRelativePath(rawCallbackUrl) ? rawCallbackUrl : "/account";

  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const t = useTranslations("auth");
  const tNav = useTranslations("nav");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    const parsed = loginSchema.safeParse({
      email: formData.get("email"),
      password: formData.get("password"),
    });

    if (!parsed.success) {
      setError(t("invalidInputError"));
      return;
    }

    setPending(true);
    const result = await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    });
    setPending(false);

    if (!result || result.error) {
      setError(t("invalidCredentialsError"));
      return;
    }

    // Best-effort, non-blocking: a referral-attribution claim failing
    // must never delay or break a successful login.
    void claimAttributionOnLoginAction();

    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium">
          {t("emailLabel")}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:border-globanic-blue"
        />
      </div>

      <div>
        <label htmlFor="password" className="mb-1 block text-sm font-medium">
          {t("passwordLabel")}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:border-globanic-blue"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-globanic-blue py-3 font-semibold text-white transition hover:bg-globanic-blueLight disabled:opacity-60"
      >
        {pending ? t("signingInPending") : tNav("login")}
      </button>
    </form>
  );
}
