"use client";

import { Check, Eye, RefreshCw, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

const statusLabels: Record<string, string> = {
  submitted: "Eingereicht",
  reviewing: "In Prüfung",
  approved: "Freigegeben",
  rejected: "Abgelehnt"
};

const filters = ["submitted", "reviewing", "approved", "rejected"];

export default function ModerationPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [status, setStatus] = useState("submitted");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function load(nextStatus = status) {
    setLoading(true);
    setMessage("");
    try {
      const data = await api<any>(`/admin/posts?status=${encodeURIComponent(nextStatus)}`);
      setPosts(data.data || []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Beiträge konnten nicht geladen werden");
    } finally {
      setLoading(false);
    }
  }

  async function moderate(id: number, nextStatus: string) {
    setMessage("");
    try {
      await api(`/admin/posts/${id}/moderation`, {
        method: "PUT",
        body: JSON.stringify({ status: nextStatus })
      });
      await load();
      setMessage("Status gespeichert");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Moderation fehlgeschlagen");
    }
  }

  useEffect(() => {
    load(status);
  }, []);

  return (
    <main className="mx-auto max-w-6xl px-3 py-4 sm:px-4 sm:py-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-clay">Admin</p>
          <h1 className="mt-1 text-2xl font-semibold text-wine sm:text-3xl">Moderationsübersicht</h1>
        </div>
        <button onClick={() => load()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-line bg-[#fffdf9] px-3 py-2 text-wine hover:bg-blush/60">
          <RefreshCw size={16} />
          Aktualisieren
        </button>
      </div>

      <div className="-mx-3 mt-5 flex gap-2 overflow-x-auto px-3 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
        {filters.map((item) => (
          <button
            key={item}
            onClick={() => {
              setStatus(item);
              load(item);
            }}
            className={`min-h-11 shrink-0 rounded-md border border-line px-3 py-2 text-sm ${status === item ? "bg-wine text-white" : "bg-[#fffdf9] text-wine hover:bg-blush/60"}`}
          >
            {statusLabels[item]}
          </button>
        ))}
      </div>

      {message && <p className="mt-4 text-sm text-clay">{message}</p>}

      <section className="mt-5 overflow-hidden rounded-md border border-line bg-cream/95 shadow-[0_18px_45px_rgba(116,50,70,0.10)]">
        {loading && <p className="p-4 text-sm text-ink/65">Lade Beiträge...</p>}
        {!loading && posts.length === 0 && <p className="p-4 text-sm text-ink/65">Keine Beiträge in diesem Status.</p>}
        {posts.map((post) => {
          const image = post.images?.[0];
          return (
            <article key={post.id} className="grid gap-3 border-b border-line p-3 last:border-b-0 sm:gap-4 sm:p-4 md:grid-cols-[120px_1fr]">
              <div className="aspect-[4/3] overflow-hidden rounded-md border border-line bg-sage">
                {image ? <img src={`/storage/${image.thumbnail_path || image.path}`} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-xs text-ink/50">kein Bild</div>}
              </div>
              <div className="min-w-0">
                <div className="grid gap-3 sm:flex sm:flex-wrap sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <h2 className="line-clamp-2 text-lg font-semibold text-wine sm:truncate">{post.title}</h2>
                    <p className="text-sm text-ink/65">{post.location_label || "Kein Standorttext"}</p>
                    <p className="mt-1 text-xs text-ink/50">
                      {post.user?.name || "Unbekannt"} · {statusLabels[post.status] || post.status}
                    </p>
                  </div>
                  <Link href={`/posts/${post.id}`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-line bg-[#fffdf9] px-3 py-2 text-sm text-wine hover:bg-blush/60">
                    <Eye size={16} />
                    Ansehen
                  </Link>
                  <Link href={`/posts/${post.id}/edit`} className="inline-flex min-h-11 items-center justify-center rounded-md border border-line bg-[#fffdf9] px-3 py-2 text-sm text-wine hover:bg-blush/60">
                    Bearbeiten
                  </Link>
                </div>
                {post.description && <p className="mt-3 line-clamp-2 text-sm leading-6 text-ink/70">{post.description}</p>}
                <div className="mt-4 grid gap-2 sm:flex sm:flex-wrap">
                  <button onClick={() => moderate(post.id, "reviewing")} className="min-h-11 rounded-md border border-line bg-[#fffdf9] px-3 py-2 text-sm text-wine hover:bg-blush/60">
                    In Prüfung
                  </button>
                  <button onClick={() => moderate(post.id, "approved")} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-moss px-3 py-2 text-sm font-medium text-white hover:bg-wine">
                    <Check size={16} />
                    Freigeben
                  </button>
                  <button onClick={() => moderate(post.id, "rejected")} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-clay px-3 py-2 text-sm font-medium text-white hover:bg-wine">
                    <X size={16} />
                    Ablehnen
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}
