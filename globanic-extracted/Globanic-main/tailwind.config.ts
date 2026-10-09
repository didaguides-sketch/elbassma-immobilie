import type { Config } from "tailwindcss";

/**
 * Globanic Phase 1 design tokens.
 *
 * Palette intent (from the design brief): deep academic navy as the
 * primary brand color, a genuine cool-gray/slate neutral SCALE (not
 * Tailwind's default gray, which was the old fallback and reads as
 * generic-SaaS) for all text/border/surface work, electric blue as the
 * one accent used for interactive/primary actions, and amber used
 * sparingly for a small set of premium/academic-emphasis moments
 * (verified badges, featured content) — never as a general-purpose
 * color.
 *
 * "slate" here is Globanic's own tuned scale, not an alias for
 * Tailwind's built-in slate/gray — it's warmed very slightly to sit
 * comfortably next to `paper` and `navy` rather than reading as a
 * generic UI-kit gray.
 */
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        globanic: {
          navy: "#0B1E4D",
          navyDeep: "#071531", // for dark sections (footer, hero overlays) — not a tint of navy, a distinct deeper stop so dark sections don't just look like "navy with less light"
          blue: "#1E5FD9",
          blueLight: "#3B7DFF",
          blueDeep: "#123E96", // pressed/active states, and text-on-light needing higher contrast than `blue`
          paper: "#F7F5F1",
          amber: "#C98A2C",
          amberDeep: "#9C6A1E",
        },
        // Neutral scale used for nearly everything: body text, borders,
        // muted surfaces, disabled states. This replaces bare `gray-*`
        // utilities everywhere in the product — a page reaching for
        // `text-gray-500` instead of `text-slate-500` is a regression,
        // not a style choice, because it silently reintroduces
        // Tailwind's default (unrelated, slightly cooler) gray ramp
        // next to Globanic's tuned one.
        slate: {
          50: "#F7F8FA",
          100: "#EEF0F4",
          200: "#DDE1E8",
          300: "#C3C9D4",
          400: "#9BA3B5",
          500: "#717B91",
          600: "#545E76",
          700: "#3D465C",
          800: "#282F41",
          900: "#181D2A",
          950: "#0E1219",
        },
      },
      fontFamily: {
        // See src/app/fonts.ts — both are next/font variables, loaded
        // as a fallback CHAIN (not switched conditionally): a Latin
        // character renders in the sans/serif Latin face, and an
        // Arabic character in the same string automatically falls
        // through to the paired Arabic face, because that's how CSS
        // font-family fallback resolves per-glyph. This is what lets
        // mixed Arabic/French/English content (which this app has
        // throughout) render correctly without JS branching on locale.
        sans: ["var(--font-sans-latin)", "var(--font-sans-arabic)", "system-ui", "sans-serif"],
        serif: ["var(--font-serif-latin)", "var(--font-serif-arabic)", "Georgia", "serif"],
      },
      fontSize: {
        // Paired [size, {lineHeight, letterSpacing}] — a real type
        // scale instead of ad hoc text-xs/text-3xl per component.
        // "display" is reserved for hero/marketing headlines only.
        display: ["3.5rem", { lineHeight: "1.05", letterSpacing: "-0.02em" }],
        h1: ["2.5rem", { lineHeight: "1.15", letterSpacing: "-0.015em" }],
        h2: ["2rem", { lineHeight: "1.2", letterSpacing: "-0.01em" }],
        h3: ["1.5rem", { lineHeight: "1.3", letterSpacing: "-0.005em" }],
        h4: ["1.25rem", { lineHeight: "1.4" }],
        "body-lg": ["1.125rem", { lineHeight: "1.65" }],
        body: ["1rem", { lineHeight: "1.6" }],
        "body-sm": ["0.875rem", { lineHeight: "1.55" }],
        caption: ["0.75rem", { lineHeight: "1.4", letterSpacing: "0.01em" }],
      },
      borderRadius: {
        // Deliberately restrained — see design brief item 6 ("premium
        // does not mean decorative"). No rounded-xl/rounded-full as a
        // default card treatment; the largest radius in normal use is
        // `lg` (10px). `full` still exists for genuinely circular
        // things (avatars, dots), not as a "friendly card" aesthetic.
        sm: "4px",
        DEFAULT: "6px",
        md: "8px",
        lg: "10px",
      },
      boxShadow: {
        // A restrained two-step elevation system, not shadow-sm
        // everywhere. `raised` for the rare surface that genuinely
        // needs to lift off the page (a dropdown, a dialog) — not for
        // ordinary cards, which should be distinguished by a border or
        // background shift instead.
        subtle: "0 1px 2px 0 rgba(14, 18, 25, 0.04)",
        raised: "0 8px 24px -8px rgba(14, 18, 25, 0.16)",
      },
      maxWidth: {
        content: "72rem", // 1152px — the shared reading/layout container width used site-wide, replacing ad hoc max-w-5xl/max-w-2xl per page
      },
    },
  },
  plugins: [],
};
export default config;
