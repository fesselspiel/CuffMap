import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "CuffMap",
  description: "Community-Karte für Produktfotos und reale Einsatzorte"
};

const nav = [
  ["Karte", "/"],
  ["Beitrag", "/posts/create"],
  ["Meine Beiträge", "/me/posts"],
  ["Profil", "/profile"],
  ["Registrieren", "/register"],
  ["Admin", "/admin"]
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>
        <header className="sticky top-0 z-[1200] border-b border-line bg-cream/95 shadow-[0_10px_30px_rgba(116,50,70,0.08)] backdrop-blur">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 px-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:px-4 sm:py-3">
            <Link href="/" className="shrink-0 text-xl font-semibold tracking-wide text-wine">
              CuffMap
            </Link>
            <nav className="-mx-3 flex max-w-full items-center gap-1 overflow-x-auto px-3 pb-1 text-sm sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
              {nav.map(([label, href]) => (
                <Link key={href} href={href} className="shrink-0 rounded-md px-3 py-2.5 text-ink/80 hover:bg-blush hover:text-wine">
                  {label}
                </Link>
              ))}
              <Link href="/login" className="shrink-0 rounded-md bg-wine px-3 py-2.5 font-medium text-white shadow-sm hover:bg-rose">
                Login
              </Link>
            </nav>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
