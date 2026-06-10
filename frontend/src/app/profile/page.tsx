"use client";

import { Download, Globe2, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [publicSubdomain, setPublicSubdomain] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    api<any>("/auth/me")
      .then((data) => {
        setUser(data);
        setPublicSubdomain(data.public_subdomain || "");
      })
      .catch(() => setUser(null));
  }, []);

  function publicBaseDomain() {
    const configured = process.env.NEXT_PUBLIC_PUBLIC_BASE_DOMAIN || process.env.NEXT_PUBLIC_APP_URL;
    if (!configured && typeof window !== "undefined") return window.location.hostname;

    try {
      return new URL(configured || "").hostname;
    } catch {
      return configured || "cuffmap.fesselspiel.com";
    }
  }

  async function saveSubdomain() {
    setMessage("");
    try {
      const updated = await api<any>("/auth/me/subdomain", {
        method: "PUT",
        body: JSON.stringify({ public_subdomain: publicSubdomain }),
      });
      setUser(updated);
      setPublicSubdomain(updated.public_subdomain || "");
      setMessage("Subdomain gespeichert.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Subdomain konnte nicht gespeichert werden.");
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-3 py-4 sm:px-4 sm:py-8">
      <div className="rounded-md border border-line bg-cream/95 p-4 shadow-[0_18px_45px_rgba(116,50,70,0.10)] sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-clay">Konto</p>
        <h1 className="mt-1 text-2xl font-semibold text-wine sm:text-3xl">Profil</h1>
        {user ? (
          <div className="mt-4 space-y-3">
            <p>{user.name}</p>
            <p className="text-ink/65">{user.email}</p>
            <section className="rounded-md border border-line bg-[#fffdf9]/80 p-4 shadow-sm">
              <label className="flex items-center gap-2 text-sm font-medium text-wine">
                <Globe2 size={17} className="text-rose" />
                Öffentliche CuffMap-Subdomain
              </label>
              <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto]">
                <div className="flex min-h-11 min-w-0 items-center rounded-md border border-line bg-[#fffdf9] px-3 py-2">
                  <input
                    value={publicSubdomain}
                    onChange={(event) => setPublicSubdomain(event.target.value.toLowerCase())}
                    className="min-w-0 flex-1 bg-transparent outline-none"
                    placeholder="username"
                  />
                  <span className="max-w-[45%] truncate text-sm text-ink/55 sm:max-w-none">.{publicBaseDomain()}</span>
                </div>
                <button onClick={saveSubdomain} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-wine px-4 py-2 text-white shadow-sm hover:bg-rose">
                  <Save size={16} />
                  Speichern
                </button>
              </div>
              <p className="mt-2 text-xs leading-5 text-ink/55">
                Erlaubt sind Kleinbuchstaben, Zahlen und Bindestriche. Reservierte Namen wie admin, api, www oder shopify sind gesperrt.
              </p>
              {user.public_subdomain && (
                <a href={`https://${user.public_subdomain}.${publicBaseDomain()}`} target="_blank" className="mt-2 inline-block text-sm font-medium text-rose underline">
                  Öffentliche Seite öffnen
                </a>
              )}
              {message && <p className="mt-2 text-sm text-clay">{message}</p>}
            </section>
            <button
              onClick={() =>
                api("/auth/account/export", { method: "POST" }).then((data) => {
                  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement("a");
                  link.href = url;
                  link.download = "cuffmap-export.json";
                  link.click();
                  URL.revokeObjectURL(url);
                })
              }
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-line bg-[#fffdf9] px-3 py-2 hover:bg-blush/55 sm:w-auto"
            >
              <Download size={16} />
              Datenexport
            </button>
            <button onClick={() => api("/auth/account", { method: "DELETE" })} className="mt-2 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-line bg-[#fffdf9] px-3 py-2 text-clay hover:bg-blush/55 sm:ml-2 sm:mt-0 sm:w-auto">
              <Trash2 size={16} />
              Konto löschen
            </button>
          </div>
        ) : (
          <p className="mt-4 text-ink/65">Nicht angemeldet.</p>
        )}
      </div>
    </main>
  );
}
