import type { ButtonHTMLAttributes, ReactNode } from "react";

/**
 * Base button primitive. Restrained by design (see brief item 6):
 * `rounded` (6px, the token default) not `rounded-xl`/`rounded-full`,
 * no shadow on the default/secondary variants, no gradient. `primary`
 * is the only variant that reads as "loud," and even that is a flat
 * fill, not a gradient.
 */

type Variant = "primary" | "secondary" | "ghost" | "destructive";
type Size = "sm" | "md" | "lg";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: "bg-globanic-navy text-white hover:bg-globanic-navyDeep active:bg-globanic-navyDeep disabled:bg-slate-300",
  secondary: "border border-slate-300 bg-white text-globanic-navy hover:bg-slate-50 disabled:text-slate-400 disabled:border-slate-200",
  ghost: "text-globanic-navy hover:bg-slate-100 disabled:text-slate-400",
  destructive: "bg-red-600 text-white hover:bg-red-700 disabled:bg-red-200",
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: "h-8 px-3 text-body-sm gap-1.5",
  md: "h-10 px-4 text-body gap-2",
  lg: "h-12 px-6 text-body-lg gap-2",
};

export function Button({
  variant = "secondary",
  size = "md",
  className = "",
  children,
  ...props
}: {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded font-medium transition-colors disabled:cursor-not-allowed ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
