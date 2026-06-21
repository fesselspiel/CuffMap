"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, postHref } from "@/lib/api";

export default function MyPostsPage() {
  const [posts, setPosts] = useState<any[]>([]);
  useEffect(() => {
    api<any>("/me/posts").then((data) => setPosts(data.data || [])).catch(() => setPosts([]));
  }, []);

  return (
    <main className="mx-auto max-w-5xl px-3 py-4 sm:px-4 sm:py-8">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-clay">CuffMap</p>
      <h1 className="mt-1 text-2xl font-semibold text-wine sm:text-3xl">Meine Beiträge</h1>
      <div className="mt-5 grid gap-3">
        {posts.map((post) => (
          <div key={post.id} className="grid gap-3 rounded-md border border-line bg-cream/95 p-4 shadow-sm hover:bg-blush/45 sm:flex sm:flex-wrap sm:items-center sm:justify-between">
            <Link href={postHref(post)} className="min-w-0">
              <strong className="block text-wine sm:inline">{post.title}</strong>
              <span className="mt-2 inline-block rounded-md bg-blush px-2 py-1 text-xs text-wine sm:ml-3 sm:mt-0">{post.status}</span>
            </Link>
            <Link href={postHref(post, "/edit")} className="inline-flex min-h-11 items-center justify-center rounded-md border border-line bg-[#fffdf9] px-3 py-2 text-sm text-wine hover:bg-blush/60">
              Bearbeiten
            </Link>
          </div>
        ))}
      </div>
    </main>
  );
}
