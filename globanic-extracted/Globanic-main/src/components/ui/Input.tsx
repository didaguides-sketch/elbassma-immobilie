import type { InputHTMLAttributes } from "react";

/**
 * Text input primitive. Notably: no manual focus:border-* / focus:ring-*
 * classes here — the global :focus-visible rule in globals.css already
 * applies a consistent ring to every focusable element, so components
 * stop reinventing their own focus treatment (the earlier payout forms,
 * e.g. CcpPayoutAccountForm, each hand-rolled `focus:border-globanic-blue`
 * — this replaces that pattern going forward). Error state uses both a
 * red border AND text (never color alone).
 */
export function Input({
  error,
  className = "",
  ...props
}: { error?: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <input
        className={`h-10 w-full rounded border px-3 text-body text-globanic-navy placeholder:text-slate-400 disabled:bg-slate-50 disabled:text-slate-400 ${
          error ? "border-red-400" : "border-slate-300"
        } ${className}`}
        aria-invalid={Boolean(error)}
        {...props}
      />
      {error && <p className="mt-1 text-body-sm text-red-600">{error}</p>}
    </div>
  );
}
