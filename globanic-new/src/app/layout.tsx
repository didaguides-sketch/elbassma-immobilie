import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Providers } from "./providers";
import { getSiteUrl } from "@/lib/utils/site-url";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: "Globanic — La connaissance à portée de main",
    template: "%s | Globanic",
  },
  description:
    "Plateforme académique pour publier et découvrir cours, mémoires, articles, thèses et livres.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" dir="ltr">
      <body className="min-h-screen bg-white text-globanic-navy antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
