import { IBM_Plex_Sans, IBM_Plex_Sans_Arabic, Newsreader, Noto_Naskh_Arabic } from "next/font/google";

/**
 * Font strategy (Phase 1 of the Globanic redesign):
 *
 * UI text (nav, buttons, tables, forms, body copy): IBM Plex Sans +
 * IBM Plex Sans Arabic. Chosen for the "precision / modern technology"
 * character the brief asks for (see Linear as a reference point) while
 * having a genuinely designed Arabic companion face from the same
 * family — not a generic system Arabic fallback bolted onto a Latin
 * choice made in isolation, which is how Arabic ends up feeling like
 * an afterthought.
 *
 * Editorial text (article headings, About-page storytelling,
 * long-form pull quotes): Newsreader + Noto Naskh Arabic. A serif pair
 * used ONLY in editorial contexts per the design brief ("optionally use
 * a refined editorial serif for selected article headings... do not use
 * too many font families") — never for UI chrome, buttons, or tables.
 *
 * Both pairs are exposed as CSS variables and combined into Tailwind's
 * `font-sans` / `font-serif` as a single fallback CHAIN (see
 * tailwind.config.ts) — not switched via lang/dir — so a French
 * sentence containing an Arabic proper noun, or vice versa, renders
 * each character in its correct face automatically.
 */

export const sansLatin = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans-latin",
  display: "swap",
});

export const sansArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans-arabic",
  display: "swap",
});

export const serifLatin = Newsreader({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-serif-latin",
  display: "swap",
});

export const serifArabic = Noto_Naskh_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-serif-arabic",
  display: "swap",
});

/** Combine into one className string for <html>. */
export const fontVariables = [
  sansLatin.variable,
  sansArabic.variable,
  serifLatin.variable,
  serifArabic.variable,
].join(" ");
