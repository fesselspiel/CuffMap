"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, getStoredToken } from "@/lib/api";

type CurrentUser = {
  id: number;
  name?: string;
  username?: string;
  email?: string;
  role?: { slug?: string; name?: string } | null;
};

const publicNav = [
  ["Karte", "/"],
  ["Beitrag", "/posts/create"],
  ["Meine Beiträge", "/me/posts"],
  ["Profil", "/profile"]
];

export default function MainNav() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!getStoredToken()) {
      setChecked(true);
      return;
    }

    api<CurrentUser>("/auth/me")
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setChecked(true));
  }, []);

  const isAdmin = user?.role?.slug === "administrator";

  return (
    <nav className="-mx-3 flex max-w-full items-center gap-1 overflow-x-auto px-3 pb-1 text-sm sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
      {publicNav.map(([label, href]) => (
        <Link key={href} href={href} className="shrink-0 rounded-md px-3 py-2.5 text-ink/80 hover:bg-blush hover:text-wine">
          {label}
        </Link>
      ))}
      {isAdmin && (
        <Link href="/admin" className="shrink-0 rounded-md px-3 py-2.5 text-ink/80 hover:bg-blush hover:text-wine">
          Admin
        </Link>
      )}
      {!user && checked && (
        <Link href="/register" className="shrink-0 rounded-md px-3 py-2.5 text-ink/80 hover:bg-blush hover:text-wine">
          Registrieren
        </Link>
      )}
      <Link href="/login" className="shrink-0 rounded-md bg-wine px-3 py-2.5 font-medium text-white shadow-sm hover:bg-rose">
        {user ? "Konto" : "Login"}
      </Link>
    </nav>
  );
}
