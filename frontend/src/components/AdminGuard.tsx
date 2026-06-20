"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { api, getStoredToken } from "@/lib/api";

type CurrentUser = {
  id: number;
  role?: { slug?: string; name?: string } | null;
};

type AdminGuardProps = {
  children: React.ReactNode;
  allowedRoles?: string[];
};

export default function AdminGuard({ children, allowedRoles = ["administrator"] }: AdminGuardProps) {
  const router = useRouter();
  const roleKey = allowedRoles.join("|");
  const allowedRoleSet = useMemo(() => new Set(allowedRoles), [roleKey]);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    if (!getStoredToken()) {
      router.replace("/login");
      return;
    }

    api<CurrentUser>("/auth/me")
      .then((currentUser) => {
        setUser(currentUser);
        setDenied(!allowedRoleSet.has(currentUser.role?.slug || ""));
      })
      .catch(() => router.replace("/login"))
      .finally(() => setLoading(false));
  }, [allowedRoleSet, router]);

  if (loading) {
    return <main className="mx-auto max-w-4xl px-3 py-8 text-wine sm:px-4">Prüfe Berechtigung...</main>;
  }

  if (denied || !user) {
    return (
      <main className="mx-auto max-w-4xl px-3 py-8 sm:px-4">
        <section className="rounded-md border border-line bg-cream/95 p-5 shadow-[0_18px_45px_rgba(116,50,70,0.10)]">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-clay">Zugriff gesperrt</p>
          <h1 className="mt-2 text-2xl font-semibold text-wine">Keine Admin-Berechtigung</h1>
          <p className="mt-2 text-sm leading-6 text-ink/70">Dieser Bereich ist nur für berechtigte Konten sichtbar.</p>
          <Link href="/" className="mt-4 inline-flex min-h-11 items-center rounded-md bg-wine px-4 py-2 text-sm font-medium text-white hover:bg-rose">
            Zur Karte
          </Link>
        </section>
      </main>
    );
  }

  return <>{children}</>;
}
