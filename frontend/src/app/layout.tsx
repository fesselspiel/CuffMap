import type { Metadata } from "next";
import Link from "next/link";
import MainNav from "@/components/MainNav";
import "./globals.css";

export const metadata: Metadata = {
  title: "CuffMap",
  description: "Community-Karte für Produktfotos und reale Einsatzorte"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>
        <header className="sticky top-0 z-[1200] border-b border-line bg-cream/95 shadow-[0_10px_30px_rgba(116,50,70,0.08)] backdrop-blur">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 px-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:px-4 sm:py-3">
            <Link href="/" className="shrink-0 text-xl font-semibold tracking-wide text-wine">
              CuffMap
            </Link>
            <MainNav />
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
