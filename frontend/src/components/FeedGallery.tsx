"use client";

import { ChevronLeft, ChevronRight, ExternalLink, Heart, ImageIcon, Images, MapPin, MessageCircle, ShoppingBag, UserCircle, X } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { api, getStoredToken, postHref } from "@/lib/api";

const PostLocationMap = dynamic(() => import("@/components/PostLocationMap"), { ssr: false });

type FeedImage = {
  id: number;
  path: string;
  thumbnail_path?: string | null;
  width?: number | null;
  height?: number | null;
};

type FeedProduct = {
  id: number;
  title: string;
  display_title?: string | null;
  image_url?: string | null;
  shop_url?: string | null;
};

type FeedPost = {
  id: number;
  slug?: string | null;
  title: string;
  description?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  location_label?: string | null;
  published_at?: string | null;
  user?: {
    id: number;
    name?: string | null;
    username?: string | null;
    public_subdomain?: string | null;
  } | null;
  images: FeedImage[];
  products: FeedProduct[];
  instagram_links?: Array<{
    permalink: string;
    username?: string | null;
    caption?: string | null;
    thumbnail_url?: string | null;
    media_url?: string | null;
    media_product_type?: string | null;
    media_type?: string | null;
  }>;
};

type Paginated<T> = {
  data: T[];
};

type FeedComment = {
  id: number;
  body: string;
  created_at?: string;
  user?: {
    id: number;
    name?: string | null;
    username?: string | null;
  } | null;
};

function imageUrl(image?: FeedImage | null) {
  if (!image) return "";
  return `/storage/${image.thumbnail_path || image.path}`;
}

function userLabel(post: FeedPost) {
  return post.user?.username || post.user?.name || "Community";
}

function initials(value: string) {
  return value
    .split(/\s|_/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "C";
}

export default function FeedGallery() {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [activeUser, setActiveUser] = useState<number | "all">("all");
  const [activePost, setActivePost] = useState<FeedPost | null>(null);
  const [likedIds, setLikedIds] = useState<Set<number>>(new Set());
  const [comments, setComments] = useState<FeedComment[]>([]);
  const [commentBody, setCommentBody] = useState("");
  const [commentStatus, setCommentStatus] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<Paginated<FeedPost>>("/feed?per_page=90")
      .then((response) => setPosts(response.data || []))
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (posts.length === 0 || activePost || typeof window === "undefined") return;
    const requestedPost = new URLSearchParams(window.location.search).get("post");
    if (!requestedPost) return;

    const match = posts.find((post) => String(post.slug || post.id) === requestedPost || String(post.id) === requestedPost);
    if (match) setActivePost(match);
  }, [activePost, posts]);

  useEffect(() => {
    if (!activePost) {
      document.body.style.overflow = "";
      setComments([]);
      setCommentBody("");
      setCommentStatus("");
      return;
    }

    document.body.style.overflow = "hidden";
    api<FeedComment[]>(`/posts/${activePost.slug || activePost.id}/comments`)
      .then(setComments)
      .catch(() => setComments([]));

    return () => {
      document.body.style.overflow = "";
    };
  }, [activePost]);

  const albums = useMemo(() => {
    const grouped = new Map<number, { id: number; label: string; count: number; cover?: string }>();
    posts.forEach((post) => {
      const id = post.user?.id || 0;
      const current = grouped.get(id);
      grouped.set(id, {
        id,
        label: userLabel(post),
        count: (current?.count || 0) + 1,
        cover: current?.cover || imageUrl(post.images?.[0]),
      });
    });

    return Array.from(grouped.values()).sort((a, b) => a.label.localeCompare(b.label, "de"));
  }, [posts]);

  const visiblePosts = activeUser === "all" ? posts : posts.filter((post) => (post.user?.id || 0) === activeUser);
  const activeImage = activePost?.images?.[0];
  const activeLiked = activePost ? likedIds.has(activePost.id) : false;
  const activeIndex = activePost ? visiblePosts.findIndex((post) => post.id === activePost.id) : -1;
  const canNavigatePosts = visiblePosts.length > 1 && activeIndex >= 0;
  const activeLatitude = Number(activePost?.latitude);
  const activeLongitude = Number(activePost?.longitude);
  const activeHasLocation = Number.isFinite(activeLatitude) && Number.isFinite(activeLongitude);

  function toggleLike(postId: number) {
    setLikedIds((current) => {
      const next = new Set(current);
      if (next.has(postId)) next.delete(postId);
      else next.add(postId);
      return next;
    });
  }

  async function submitComment() {
    if (!activePost || !commentBody.trim()) return;
    if (!getStoredToken()) {
      setCommentStatus("Bitte einloggen, um zu kommentieren.");
      return;
    }

    setSubmittingComment(true);
    setCommentStatus("");
    try {
      const comment = await api<FeedComment>(`/posts/${activePost.slug || activePost.id}/comments`, {
        method: "POST",
        body: JSON.stringify({ body: commentBody.trim() }),
      });
      setComments((current) => [...current, comment]);
      setCommentBody("");
    } catch (error) {
      setCommentStatus(error instanceof Error ? error.message : "Kommentar konnte nicht gespeichert werden.");
    } finally {
      setSubmittingComment(false);
    }
  }

  function showAdjacentPost(direction: -1 | 1) {
    if (!canNavigatePosts) return;
    const nextIndex = (activeIndex + direction + visiblePosts.length) % visiblePosts.length;
    setActivePost(visiblePosts[nextIndex]);
  }

  return (
    <main className="min-h-[calc(100vh-92px)] bg-[#fff8f1] lg:min-h-[calc(100vh-57px)]">
      <section className="mx-auto max-w-7xl px-3 py-4 sm:px-5 sm:py-6">
        <div className="mb-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-clay">Community Feed</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-wide text-wine sm:text-4xl">Bildergalerie</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/68">
              Projektbilder als ruhiger, bildzentrierter Feed mit Benutzer-Alben, Produkten und verknüpften Beiträgen.
            </p>
          </div>
          <div className="rounded-md border border-line bg-cream/90 p-3 text-sm text-ink/70 shadow-sm">
            {loading ? "Lade Bilder..." : `${visiblePosts.length} Bilder sichtbar`}
          </div>
        </div>

        <div className="mb-5 flex gap-3 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setActiveUser("all")}
            className={[
              "inline-flex min-h-14 shrink-0 items-center gap-3 rounded-md border px-3 py-2 text-left shadow-sm transition",
              activeUser === "all" ? "border-wine bg-wine text-white" : "border-line bg-cream/90 text-wine hover:bg-blush/60",
            ].join(" ")}
          >
            <span className="grid h-10 w-10 place-items-center rounded-md bg-[#fffdf9]/20">
              <Images size={20} />
            </span>
            <span>
              <span className="block text-sm font-semibold">Alle Alben</span>
              <span className="block text-xs opacity-75">{posts.length} Bilder</span>
            </span>
          </button>
          {albums.map((album) => (
            <button
              key={album.id}
              type="button"
              onClick={() => setActiveUser(album.id)}
              className={[
                "inline-flex min-h-14 shrink-0 items-center gap-3 rounded-md border px-3 py-2 text-left shadow-sm transition",
                activeUser === album.id ? "border-wine bg-wine text-white" : "border-line bg-cream/90 text-wine hover:bg-blush/60",
              ].join(" ")}
            >
              <span className="grid h-10 w-10 place-items-center overflow-hidden rounded-md border border-white/50 bg-blush">
                {album.cover ? <img src={album.cover} alt="" className="h-full w-full object-cover" /> : initials(album.label)}
              </span>
              <span>
                <span className="block max-w-36 truncate text-sm font-semibold">{album.label}</span>
                <span className="block text-xs opacity-75">{album.count} Bilder</span>
              </span>
            </button>
          ))}
        </div>

        {visiblePosts.length === 0 && !loading ? (
          <div className="grid min-h-72 place-items-center rounded-md border border-line bg-cream/90 p-8 text-center text-wine shadow-sm">
            <div>
              <ImageIcon className="mx-auto mb-3 text-rose" size={34} />
              Noch keine freigegebenen Bilder in diesem Album.
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4 xl:grid-cols-5">
            {visiblePosts.map((post) => {
              const cover = imageUrl(post.images?.[0]);
              return (
                <button
                  key={post.id}
                  type="button"
                  onClick={() => setActivePost(post)}
                  className="group relative aspect-square overflow-hidden rounded-md border border-line bg-blush text-left shadow-sm focus:outline-none focus:ring-4 focus:ring-rose/20"
                >
                  {cover ? (
                    <img src={cover} alt="" className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]" />
                  ) : (
                    <span className="grid h-full w-full place-items-center text-wine">kein Bild</span>
                  )}
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-wine/84 to-transparent p-2 pt-10 text-white opacity-0 transition group-hover:opacity-100">
                    <span className="block truncate text-sm font-semibold">{post.title}</span>
                    <span className="mt-1 flex items-center gap-1 text-xs text-white/80">
                      <UserCircle size={13} /> {userLabel(post)}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {activePost && (
        <div className="fixed inset-0 z-[2000] overflow-y-auto overscroll-contain bg-ink/70 p-3 backdrop-blur-sm sm:p-5" role="dialog" aria-modal="true" style={{ WebkitOverflowScrolling: "touch" }}>
          <button
            type="button"
            onClick={() => setActivePost(null)}
            className="absolute right-4 top-4 z-[2020] grid h-11 w-11 place-items-center rounded-full border border-white/45 bg-black/45 text-white shadow-lg backdrop-blur hover:bg-black/65"
            aria-label="Feed-Detail schließen"
          >
            <X size={22} />
          </button>
          {canNavigatePosts && (
            <>
              <button
                type="button"
                onClick={() => showAdjacentPost(-1)}
                className="absolute left-4 top-1/2 z-[2020] grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/45 bg-black/45 text-white shadow-lg backdrop-blur hover:bg-black/65"
                aria-label="Vorheriges Bild anzeigen"
              >
                <ChevronLeft size={24} />
              </button>
              <button
                type="button"
                onClick={() => showAdjacentPost(1)}
                className="absolute right-4 top-1/2 z-[2020] grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/45 bg-black/45 text-white shadow-lg backdrop-blur hover:bg-black/65"
                aria-label="Nächstes Bild anzeigen"
              >
                <ChevronRight size={24} />
              </button>
            </>
          )}
          <div className="mx-auto grid min-h-full max-w-6xl overflow-hidden rounded-md border border-line bg-cream shadow-[0_24px_80px_rgba(52,36,43,0.36)] lg:h-full lg:grid-cols-[minmax(0,1fr)_380px]">
            <div className="relative bg-[#2b1d24] p-2 sm:p-4 lg:min-h-0 lg:overflow-hidden">
              <div className="flex justify-center lg:h-full lg:items-start">
                {activeImage && <img src={`/storage/${activeImage.path}`} alt="" className="max-h-[78vh] max-w-full object-contain lg:max-h-full" />}
              </div>
            </div>

            <aside className="border-t border-line bg-[#fffdf9] p-4 lg:min-h-0 lg:overflow-auto lg:border-l lg:border-t-0">
              <div className="flex items-start gap-3">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-md bg-blush text-sm font-semibold text-wine">
                  {initials(userLabel(activePost))}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-wine">{userLabel(activePost)}</p>
                  <h2 className="mt-1 text-xl font-semibold leading-tight text-ink">{activePost.title}</h2>
                  {activePost.location_label && (
                    <p className="mt-1 flex items-center gap-1 text-sm text-ink/60">
                      <MapPin size={14} /> {activePost.location_label}
                    </p>
                  )}
                </div>
              </div>

              {activePost.description && <p className="mt-4 whitespace-pre-line text-sm leading-6 text-ink/78">{activePost.description}</p>}

              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => toggleLike(activePost.id)}
                  className={[
                    "inline-flex min-h-10 items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition",
                    activeLiked ? "border-wine bg-wine text-white" : "border-line bg-cream text-wine hover:bg-blush/60",
                  ].join(" ")}
                >
                  <Heart size={16} fill={activeLiked ? "currentColor" : "none"} />
                  {activeLiked ? "Gefällt dir" : "Gefällt mir"}
                </button>
                <Link href={postHref(activePost)} className="inline-flex min-h-10 items-center gap-2 rounded-md border border-line bg-cream px-3 py-2 text-sm font-medium text-wine hover:bg-blush/60">
                  <MessageCircle size={16} /> {comments.length} Kommentare
                </Link>
              </div>

              <section className="mt-5 space-y-3 rounded-md border border-line bg-cream/80 p-3">
                <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-clay">Kommentare</h3>
                <div className="space-y-2">
                  {comments.length ? (
                    comments.map((comment) => (
                      <article key={comment.id} className="rounded-md border border-line bg-[#fffdf9] p-3">
                        <p className="text-xs font-semibold text-wine">{comment.user?.username || comment.user?.name || "Community"}</p>
                        <p className="mt-1 whitespace-pre-line text-sm leading-5 text-ink/75">{comment.body}</p>
                      </article>
                    ))
                  ) : (
                    <p className="text-sm text-ink/58">Noch keine Kommentare.</p>
                  )}
                </div>
                <div className="space-y-2">
                  <textarea
                    value={commentBody}
                    onChange={(event) => setCommentBody(event.target.value)}
                    placeholder="Kommentar schreiben..."
                    className="min-h-24 w-full resize-y rounded-md border border-line px-3 py-2 text-sm"
                    maxLength={1200}
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={submitComment}
                      disabled={submittingComment || !commentBody.trim()}
                      className="inline-flex min-h-10 items-center rounded-md bg-wine px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-55"
                    >
                      {submittingComment ? "Speichert..." : "Kommentieren"}
                    </button>
                    {!getStoredToken() && (
                      <Link href="/login" className="text-sm font-medium text-rose hover:text-wine">
                        Einloggen
                      </Link>
                    )}
                  </div>
                  {commentStatus && <p className="text-sm text-rose">{commentStatus}</p>}
                </div>
              </section>

              {activePost.products?.length > 0 && (
                <section className="mt-5 space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-clay">Produkte</h3>
                  {activePost.products.map((product) => (
                    <a key={product.id} href={product.shop_url || "#"} className="grid grid-cols-[52px_minmax(0,1fr)] items-center gap-3 rounded-md border border-line bg-cream/80 p-2 hover:bg-blush/45">
                      <span className="grid h-[52px] w-[52px] place-items-center overflow-hidden rounded-md border border-line bg-sage">
                        {product.image_url ? <img src={product.image_url} alt="" className="h-full w-full object-contain" /> : <ShoppingBag size={18} />}
                      </span>
                      <span className="min-w-0">
                        <strong className="block truncate text-sm text-wine">{product.display_title || product.title}</strong>
                        <span className="text-xs text-rose">Zum Shop</span>
                      </span>
                    </a>
                  ))}
                </section>
              )}

              {activeHasLocation && (
                <section className="mt-5 overflow-hidden rounded-md border border-line bg-cream/80">
                  <div className="p-3">
                    <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-clay">Standort</h3>
                    <p className="mt-2 flex items-center gap-1 text-sm font-medium text-wine">
                      <MapPin size={15} /> {activePost.location_label || "Ausgewählter Ort"}
                    </p>
                    <p className="mt-1 text-xs text-ink/55">{activeLatitude.toFixed(6)}, {activeLongitude.toFixed(6)}</p>
                  </div>
                  <div className="h-[260px] border-t border-line">
                    <PostLocationMap latitude={activeLatitude} longitude={activeLongitude} label={activePost.location_label || activePost.title} />
                  </div>
                </section>
              )}

              {activePost.instagram_links?.length ? (
                <section className="mt-5 space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-clay">Instagram</h3>
                  {activePost.instagram_links.map((link) => (
                    <a key={link.permalink} href={link.permalink} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-md border border-line bg-cream/80 p-2 text-sm text-wine hover:bg-blush/45">
                      <ExternalLink size={15} />
                      <span className="min-w-0 truncate">{link.username ? `@${link.username}` : "Instagram-Post"}</span>
                    </a>
                  ))}
                </section>
              ) : null}
            </aside>
          </div>
        </div>
      )}
    </main>
  );
}
