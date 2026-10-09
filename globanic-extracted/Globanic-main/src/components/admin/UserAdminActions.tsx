"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AccountStatus } from "@prisma/client";
import type { Role } from "@/server/auth/rbac";
import {
  suspendUserAction,
  activateUserAction,
  changeUserRoleAction,
} from "@/server/actions/user-admin.actions";
import { useTranslations } from "@/components/i18n/I18nProvider";

const ASSIGNABLE_ROLES: Role[] = ["USER", "ADMIN", "SUPER_ADMIN"];

export function UserAdminActions({
  targetUserId,
  status,
  role,
  canChangeRole,
}: {
  targetUserId: string;
  status: AccountStatus;
  role: Role;
  canChangeRole: boolean;
}) {
  const t = useTranslations("adminDashboard");
  const [pending, startTransition] = useTransition();
  const [showReason, setShowReason] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function run(action: () => Promise<{ success: boolean; message?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.success) {
        setError(result.message ?? t("actionErrorFallback"));
        return;
      }
      setShowReason(false);
      setReason("");
      router.refresh();
    });
  }

  const roleChangeEligible = ASSIGNABLE_ROLES.includes(role);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {status === "ACTIVE" ? (
          <button
            disabled={pending}
            onClick={() => setShowReason((v) => !v)}
            className="rounded bg-red-600 px-3 py-1.5 text-body-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
          >
            {t("suspendAccountCta")}
          </button>
        ) : (
          <button
            disabled={pending}
            onClick={() => run(() => activateUserAction(targetUserId))}
            className="rounded bg-green-600 px-3 py-1.5 text-body-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
          >
            {pending ? t("processingPending") : t("activateAccountCta")}
          </button>
        )}

        {canChangeRole && roleChangeEligible && (
          <select
            defaultValue={role}
            disabled={pending}
            onChange={(e) => run(() => changeUserRoleAction(targetUserId, e.target.value as Role))}
            className="rounded border border-slate-300 px-3 py-1.5 text-body-sm"
          >
            {ASSIGNABLE_ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        )}
      </div>

      {showReason && status === "ACTIVE" && (
        <div className="rounded border border-slate-200 p-3">
          <label htmlFor={`user-admin-suspension-reason-${targetUserId}`} className="mb-1 block text-caption font-medium text-slate-600">{t("suspensionReasonLabel")}</label>
          <textarea id={`user-admin-suspension-reason-${targetUserId}`}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            className="mb-2 w-full rounded border border-slate-300 px-3 py-2 text-body-sm outline-none focus:border-globanic-blue"
          />
          <button
            disabled={pending}
            onClick={() => run(() => suspendUserAction(targetUserId, reason))}
            className="rounded bg-red-600 px-4 py-1.5 text-body-sm font-semibold text-white disabled:opacity-60"
          >
            {pending ? t("sendingPending") : t("confirmSuspensionCta")}
          </button>
        </div>
      )}

      {error && <p className="text-body-sm text-red-600">{error}</p>}
    </div>
  );
}
