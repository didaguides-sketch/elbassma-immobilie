/**
 * Slugify a title into a URL-safe slug. Handles French/Arabic accented
 * characters via Unicode normalization; strips anything that isn't
 * alphanumeric or a hyphen.
 */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics (é -> e, etc.)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "") // drop remaining non-latin chars (e.g. Arabic script)
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Given a desired base slug and a lookup function that checks whether a
 * candidate is already taken (scoped however the caller needs — e.g. per
 * ResourceType), returns the first available slug: "title", then
 * "title-2", "title-3", ...
 */
export async function resolveUniqueSlug(
  baseSlug: string,
  isTaken: (candidate: string) => Promise<boolean>,
): Promise<string> {
  const fallback = baseSlug || "ressource";
  let candidate = fallback;
  let suffix = 2;

  // Bounded loop: 500 attempts is far more than any realistic collision
  // chain, and avoids an unbounded loop if isTaken() is ever miswired.
  for (let attempts = 0; attempts < 500; attempts++) {
    const taken = await isTaken(candidate);
    if (!taken) return candidate;
    candidate = `${fallback}-${suffix}`;
    suffix += 1;
  }

  throw new Error(`Could not resolve a unique slug for base "${baseSlug}"`);
}
