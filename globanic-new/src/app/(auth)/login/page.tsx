import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = { title: "تسجيل الدخول" };

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-100">
        <h1 className="mb-6 text-2xl font-bold text-globanic-navy">تسجيل الدخول</h1>
        <Suspense>
          <LoginForm />
        </Suspense>
        <p className="mt-6 text-center text-sm text-gray-600">
          ليس لديك حساب؟{" "}
          <a href="/register" className="font-semibold text-globanic-blue">
            إنشاء حساب
          </a>
        </p>
      </div>
    </main>
  );
}
