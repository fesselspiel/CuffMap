"use client";

import { Images, LayoutDashboard, LogIn, Map, Plus, User, UserCircle } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { api, getStoredToken } from "@/lib/api";

type CurrentUser = {
  id: number;
  name?: string;
  username?: string;
  email?: string;
  role?: { slug?: string; name?: string } | null;
};

const navItems = [
  { label: "Karte", href: "/", icon: Map },
  { label: "Feed", href: "/feed", icon: Images },
  { label: "Erstellen", href: "/posts/create", icon: Plus },
  { label: "Meine Beiträge", href: "/me/posts", icon: UserCircle },
  { label: "Profil", href: "/profile", icon: User }
];

function navClass(active: boolean) {
  return [
    "inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition",
    active ? "bg-blush text-wine shadow-sm" : "text-ink/72 hover:bg-[#fffdf9] hover:text-wine"
  ].join(" ");
}

export default function MainNav() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [checked, setChecked] = useState(false);
  const pathname = usePathname();

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
  const isActive = (href: string) => href === "/" ? pathname === "/" : pathname?.startsWith(href);

  return (
    <nav className="-mx-3 flex max-w-full items-center gap-2 overflow-x-auto px-3 pb-1 sm:mx-0 sm:overflow-visible sm:px-0 sm:pb-0">
      <div className="inline-flex shrink-0 items-center gap-1 rounded-md border border-line bg-cream/80 p-1 shadow-sm">
        {navItems.map(({ label, href, icon: Icon }) => (
          <Link key={href} href={href} className={navClass(isActive(href))} aria-current={isActive(href) ? "page" : undefined}>
            <Icon size={16} />
            <span className="hidden sm:inline">{label}</span>
          </Link>
        ))}
        {isAdmin && (
          <Link href="/admin" className={navClass(isActive("/admin"))} aria-current={isActive("/admin") ? "page" : undefined}>
            <LayoutDashboard size={16} />
            <span className="hidden sm:inline">Admin</span>
          </Link>
        )}
      </div>

      <div className="inline-flex shrink-0 items-center gap-1 rounded-md border border-line bg-cream/80 p-1 shadow-sm">
        {!user && checked && (
          <Link href="/register" className="inline-flex min-h-10 items-center justify-center rounded-md px-3 py-2 text-sm font-medium text-ink/72 transition hover:bg-[#fffdf9] hover:text-wine">
            Registrieren
          </Link>
        )}
        <Link href={user ? "/profile" : "/login"} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-wine px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-rose">
          {user ? <User size={16} /> : <LogIn size={16} />}
          {user ? "Konto" : "Login"}
        </Link>
      </div>
    </nav>
  );
}
