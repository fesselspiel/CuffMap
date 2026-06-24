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
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-3 py-2.5 sm:px-4 lg:flex-row lg:items-center lg:justify-between">
            <Link href="/" className="inline-flex w-fit shrink-0 items-center gap-2 rounded-md px-1 py-1 text-xl font-semibold tracking-wide text-wine">
              <span className="grid h-8 w-8 place-items-center rounded-md bg-wine text-sm font-bold text-white shadow-sm">C</span>
              <span>CuffMap</span>
            </Link>
            <MainNav />
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
