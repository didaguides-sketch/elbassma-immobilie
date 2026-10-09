/**
 * Strictly parses a `?page=` query value into a positive integer page
 * number. Anything that isn't a pure sequence of digits (including
 * decimals, negative numbers, or digits with trailing garbage like
 * "2abc") is treated as invalid and normalized to 1 — never thrown, never
 * silently truncated by parseInt's permissive parsing.
 *
 * Verified cases (Phase 8): "2"->2, "10"->10, "0"->1, "-1"->1, "abc"->1,
 * "2abc"->1, "1.5"->1, "NaN"->1, undefined->1, ""->1.
 */
export function parsePage(raw?: string): number {
  if (!raw || !/^\d+$/.test(raw)) return 1;
  const n = Number.parseInt(raw, 10);
  return n >= 1 ? n : 1;
}
