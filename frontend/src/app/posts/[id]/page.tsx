"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { use, useEffect, useState } from "react";
import { api, postHref } from "@/lib/api";

const PostLocationMap = dynamic(() => import("@/components/PostLocationMap"), { ssr: false });

function isCoordinateLabel(value?: string | null) {
  return !!value?.trim().match(/^-?\d+([.,]\d+)?\s*,\s*-?\d+([.,]\d+)?$/);
}

export default function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [post, setPost] = useState<any>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    api(`/posts/${id}`).then(setPost).catch(() => setMissing(true));
  }, [id]);

  if (missing) return <main className="mx-auto max-w-4xl px-3 py-4 text-wine sm:px-4 sm:py-8">Beitrag nicht gefunden.</main>;
  if (!post) return <main className="mx-auto max-w-4xl px-3 py-4 text-wine sm:px-4 sm:py-8">Lade Beitrag...</main>;

  const image = post.images?.[0];
  const hasCoordinates = Number.isFinite(Number(post.latitude)) && Number.isFinite(Number(post.longitude));
  const latitude = Number(post.latitude);
  const longitude = Number(post.longitude);
  const locationLabel = isCoordinateLabel(post.location_label) ? null : post.location_label;

  return (
    <main className="mx-auto max-w-4xl px-3 py-4 sm:px-4 sm:py-8">
      <article className="space-y-4 rounded-md border border-line bg-cream/95 p-4 shadow-[0_18px_45px_rgba(116,50,70,0.10)] sm:space-y-5 sm:p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-clay">Beitrag</p>
          <h1 className="mt-1 text-2xl font-semibold text-wine sm:text-3xl">{post.title}</h1>
          <p className="text-ink/65">{locationLabel || "Standort auf der Karte markiert"}</p>
        </div>
        <Link href={postHref(post, "/edit")} className="inline-flex min-h-11 w-full items-center justify-center rounded-md border border-line bg-[#fffdf9] px-3 py-2 text-sm font-medium text-wine hover:bg-blush/60 sm:w-fit">
          Beitrag bearbeiten
        </Link>
        {image && (
          <figure className="overflow-hidden rounded-md border border-line bg-[#fff8f1] shadow-sm">
            <div
              className="grid max-h-[78vh] min-h-[240px] place-items-center bg-[#fffdf9]"
              style={image.width && image.height ? { aspectRatio: `${image.width} / ${image.height}` } : undefined}
            >
              <img
                src={`/storage/${image.path}`}
                alt=""
                className="max-h-[78vh] w-full object-contain"
                style={image.width && image.height ? { aspectRatio: `${image.width} / ${image.height}` } : undefined}
              />
            </div>
          </figure>
        )}
        <p className="leading-7">{post.description}</p>
        {hasCoordinates && (
          <section className="overflow-hidden rounded-md border border-line bg-[#fffdf9] shadow-sm">
            <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_260px]">
              <div className="h-[280px] min-h-[280px] lg:h-full">
                <PostLocationMap latitude={latitude} longitude={longitude} label={locationLabel || post.title} />
              </div>
              <div className="border-t border-line p-4 lg:border-l lg:border-t-0">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-clay">Standort</p>
                <h2 className="mt-2 text-lg font-semibold text-wine">{locationLabel || "Ausgewählter Ort"}</h2>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-md border border-line bg-cream/70 p-3">
                    <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/45">Breite</dt>
                    <dd className="mt-1 font-medium text-ink">{latitude.toFixed(6)}</dd>
                  </div>
                  <div className="rounded-md border border-line bg-cream/70 p-3">
                    <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/45">Länge</dt>
                    <dd className="mt-1 font-medium text-ink">{longitude.toFixed(6)}</dd>
                  </div>
                </dl>
              </div>
            </div>
          </section>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          {post.products?.map((product: any) => (
            <a key={product.id} href={product.shop_url || "#"} className="grid grid-cols-[64px_minmax(0,1fr)] items-center gap-3 rounded-md border border-line bg-[#fffdf9] p-3 hover:bg-blush/45">
              <span className="grid h-16 w-16 place-items-center overflow-hidden rounded-md border border-line bg-sage text-xs text-ink/45">
                {product.image_url ? <img src={product.image_url} alt="" className="h-full w-full object-contain" /> : "kein Bild"}
              </span>
              <span className="min-w-0">
                <strong className="block truncate text-wine">{product.display_title || product.title}</strong>
                <span className="block text-sm text-rose">Zum Shop</span>
              </span>
            </a>
          ))}
        </div>
        {post.instagram_links?.length > 0 && (
          <section className="space-y-3 rounded-md border border-line bg-[#fffdf9] p-4 shadow-sm">
            <h2 className="text-lg font-semibold text-wine">Instagram</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {post.instagram_links.map((link: any) => (
                <a key={link.permalink} href={link.permalink} target="_blank" className="grid grid-cols-[72px_minmax(0,1fr)] gap-3 rounded-md border border-line bg-cream/70 p-2 hover:bg-blush/45">
                  <span className="grid aspect-square place-items-center overflow-hidden rounded-md border border-line bg-blush text-rose">
                    {(link.thumbnail_url || link.media_url) ? <img src={link.thumbnail_url || link.media_url} alt="" className="h-full w-full object-cover" /> : "IG"}
                  </span>
                  <span className="min-w-0">
                    <strong className="block truncate text-wine">{link.username ? `@${link.username}` : "Instagram-Post"}</strong>
                    {link.caption && <span className="mt-1 line-clamp-2 block text-sm leading-5 text-ink/65">{link.caption}</span>}
                    <span className="mt-1 block text-xs text-rose">Auf Instagram öffnen</span>
                  </span>
                </a>
              ))}
            </div>
          </section>
        )}
      </article>
    </main>
  );
}
