import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth/RegisterForm";

export const metadata: Metadata = { title: "إنشاء حساب" };

export default function RegisterPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-100">
        <h1 className="mb-6 text-2xl font-bold text-globanic-navy">إنشاء حساب في Globanic</h1>
        <RegisterForm />
        <p className="mt-6 text-center text-sm text-gray-600">
          لديك حساب بالفعل؟{" "}
          <a href="/login" className="font-semibold text-globanic-blue">
            تسجيل الدخول
          </a>
        </p>
      </div>
    </main>
  );
}
