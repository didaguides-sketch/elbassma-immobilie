"use client";

import { useFormState, useFormStatus } from "react-dom";
import { registerAction, type RegisterFormState } from "@/server/actions/auth.actions";
import { useTranslations } from "@/components/i18n/I18nProvider";

const initialState: RegisterFormState = { success: false };

function SubmitButton() {
  const { pending } = useFormStatus();
  const t = useTranslations("auth");
  const tNav = useTranslations("nav");
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-globanic-blue py-3 font-semibold text-white transition hover:bg-globanic-blueLight disabled:opacity-60"
    >
      {pending ? t("creatingAccountPending") : tNav("createAccount")}
    </button>
  );
}

export function RegisterForm() {
  const [state, formAction] = useFormState(registerAction, initialState);
  const t = useTranslations("auth");
  const tNav = useTranslations("nav");

  if (state.success) {
    return (
      <div className="rounded-lg bg-green-50 p-4 text-green-800">
        {state.message}{" "}
        <a href="/login" className="font-semibold underline">
          {tNav("login")}
        </a>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="fullName" className="mb-1 block text-sm font-medium">
          {t("fullNameLabel")}
        </label>
        <input
          id="fullName"
          name="fullName"
          type="text"
          required
          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:border-globanic-blue"
        />
        {state.errors?.fullName?.map((err) => (
          <p key={err} className="mt-1 text-sm text-red-600">
            {err}
          </p>
        ))}
      </div>

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
        {state.errors?.email?.map((err) => (
          <p key={err} className="mt-1 text-sm text-red-600">
            {err}
          </p>
        ))}
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
        {state.errors?.password?.map((err) => (
          <p key={err} className="mt-1 text-sm text-red-600">
            {err}
          </p>
        ))}
      </div>

      <SubmitButton />
    </form>
  );
}
