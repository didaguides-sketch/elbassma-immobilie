/**
 * RBAC — single source of truth for server-side authorization.
 *
 * This is intentionally NOT used to hide/show UI elements only — every
 * Server Action / route handler that mutates data must call `can()` or
 * `requireRole()` itself, on the server, regardless of what the client sent.
 * Never trust a role coming from the client; always read it from the
 * server-side session (see auth.config.ts).
 */

export type Role = "USER" | "PUBLISHER" | "ADMIN" | "SUPER_ADMIN";

export type Action =
  // Publisher onboarding
  | "publisher:apply"
  | "publisher:verify"
  | "publisher:reject"
  | "publisher:suspend"
  // Resources
  | "resource:create"
  | "resource:edit-own"
  | "resource:delete-own"
  | "resource:submit"
  | "resource:edit-any"
  | "resource:view-any"
  | "resource:approve"
  | "resource:reject"
  | "resource:request-changes"
  | "resource:unpublish"
  | "resource:delete-any"
  // Users
  | "user:suspend"
  | "user:activate"
  | "user:change-role"
  | "user:view-any"
  // Catalog management
  | "university:manage"
  | "domain:manage"
  // Reports
  | "report:view-any"
  | "report:resolve"
  // Moderation audit trail
  | "moderation-log:view";

const ADMIN_ACTIONS: Action[] = [
  "publisher:verify",
  "publisher:reject",
  "publisher:suspend",
  "resource:edit-any",
  "resource:view-any",
  "resource:approve",
  "resource:reject",
  "resource:request-changes",
  "resource:unpublish",
  "resource:delete-any",
  "user:suspend",
  "user:activate",
  "user:view-any",
  "university:manage",
  "domain:manage",
  "report:view-any",
  "report:resolve",
  "moderation-log:view",
];

const PERMISSIONS: Record<Role, Action[]> = {
  USER: ["publisher:apply"],
  PUBLISHER: [
    "publisher:apply",
    "resource:create",
    "resource:edit-own",
    "resource:delete-own",
    "resource:submit",
  ],
  ADMIN: [...ADMIN_ACTIONS],
  // SUPER_ADMIN has everything ADMIN has, plus role management
  SUPER_ADMIN: [...ADMIN_ACTIONS, "user:change-role"],
};

export function can(role: Role | undefined | null, action: Action): boolean {
  if (!role) return false;
  return PERMISSIONS[role]?.includes(action) ?? false;
}

export class ForbiddenError extends Error {
  constructor(message = "FORBIDDEN") {
    super(message);
    this.name = "ForbiddenError";
  }
}

/** Throws if the role is not in the allowed list. Use inside Server Actions. */
export function requireRole(role: Role | undefined | null, allowed: Role[]): void {
  if (!role || !allowed.includes(role)) {
    throw new ForbiddenError();
  }
}

/** Throws if the role does not have the given permission. Use inside Server Actions. */
export function requirePermission(role: Role | undefined | null, action: Action): void {
  if (!can(role, action)) {
    throw new ForbiddenError();
  }
}

export const ADMIN_ROLES: Role[] = ["ADMIN", "SUPER_ADMIN"];
export const PUBLISHER_ROLES: Role[] = ["PUBLISHER", "ADMIN", "SUPER_ADMIN"];
