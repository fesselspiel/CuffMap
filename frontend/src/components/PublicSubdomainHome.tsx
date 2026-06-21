"use client";

import { MapPin } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api, Marker, postHref } from "@/lib/api";
import CuffMap from "./CuffMap";

type PublicPost = {
  id: number;
  slug?: string | null;
  title: string;
  description?: string | null;
  location_label?: string | null;
  published_at?: string | null;
  images?: Array<{ path: string; thumbnail_path?: string }>;
  products?: Array<{ id: number; title: string; display_title?: string; shop_url?: string }>;
};

type PublicContext = {
  is_subdomain: boolean;
  subdomain?: string;
  user?: { name: string; username: string; public_subdomain: string };
  posts?: PublicPost[];
  markers?: Marker[];
};

export default function PublicSubdomainHome() {
  const [context, setContext] = useState<PublicContext | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    api<PublicContext>("/public/subdomain")
      .then(setContext)
      .catch(() => setFailed(true));
  }, []);

  if (failed) {
    return (
      <main className="mx-auto max-w-3xl px-3 py-6 sm:px-4 sm:py-12">
        <div className="rounded-md border border-line bg-cream/95 p-4 shadow-[0_18px_45px_rgba(116,50,70,0.10)] sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-clay">CuffMap</p>
          <h1 className="mt-1 text-2xl font-semibold text-wine sm:text-3xl">Diese CuffMap-Seite wurde nicht gefunden.</h1>
          <Link href="/" className="mt-4 inline-block min-h-11 rounded-md bg-wine px-4 py-2.5 text-white hover:bg-rose">
            Zur Karte
          </Link>
        </div>
      </main>
    );
  }

  if (!context) {
    return <main className="px-3 py-4 text-wine sm:px-4 sm:py-8">Lade CuffMap...</main>;
  }

  if (!context.is_subdomain) {
    return <CuffMap />;
  }

  const posts = context.posts || [];
  const user = context.user;

  return (
    <main className="mx-auto max-w-6xl px-3 py-4 sm:px-4 sm:py-8">
      <section className="rounded-md border border-line bg-cream/95 p-4 shadow-[0_18px_45px_rgba(116,50,70,0.10)] sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-clay">CuffMap Profil</p>
        <h1 className="mt-1 text-3xl font-semibold text-wine sm:text-4xl">{user?.name || context.subdomain}</h1>
        <p className="mt-2 text-sm text-ink/65">@{user?.username} · {posts.length} öffentliche Beiträge</p>
      </section>

      {posts.length === 0 ? (
        <section className="mt-6 rounded-md border border-line bg-cream/95 p-4 text-ink/65 shadow-sm sm:p-6">
          Noch keine freigegebenen öffentlichen Beiträge.
        </section>
      ) : (
        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => {
            const image = post.images?.[0]?.thumbnail_path || post.images?.[0]?.path;
            const product = post.products?.[0];

            return (
              <Link key={post.id} href={postHref(post)} className="overflow-hidden rounded-md border border-line bg-cream/95 shadow-sm transition hover:-translate-y-0.5 hover:shadow-[0_18px_45px_rgba(116,50,70,0.12)]">
                {image ? (
                  <img src={`/storage/${image}`} alt="" className="aspect-[16/10] w-full object-cover" />
                ) : (
                  <div className="grid aspect-[16/10] place-items-center bg-sage text-sm text-ink/50">kein Bild</div>
                )}
                <div className="space-y-2 p-4">
                  <h2 className="line-clamp-2 text-lg font-semibold text-wine">{post.title}</h2>
                  {post.location_label && (
                    <p className="flex items-center gap-1 text-sm text-ink/65">
                      <MapPin size={14} className="text-rose" />
                      {post.location_label}
                    </p>
                  )}
                  {product && <p className="text-sm font-medium text-clay">{product.display_title || product.title}</p>}
                  {post.description && <p className="line-clamp-2 text-sm leading-5 text-ink/65">{post.description}</p>}
                </div>
              </Link>
            );
          })}
        </section>
      )}
    </main>
  );
}
