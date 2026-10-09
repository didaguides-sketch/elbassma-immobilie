/**
 * Compares two flat field maps and returns a short "field: old -> new"
 * summary of what changed, or null if nothing did. Used to make
 * UPDATE_* ModerationLog `reason` entries informative instead of just
 * "updated" — same spirit as CHANGE_ROLE's `"${previousRole} -> ${newRole}"`
 * in user-admin.service.ts, generalized to an arbitrary field set.
 */
export function diffFields(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): string | null {
  const changes: string[] = [];
  for (const key of Object.keys(after)) {
    const beforeValue = before[key] ?? null;
    const afterValue = after[key] ?? null;
    if (beforeValue !== afterValue) {
      changes.push(`${key}: "${beforeValue ?? ""}" -> "${afterValue ?? ""}"`);
    }
  }
  return changes.length > 0 ? changes.join("; ") : null;
}
