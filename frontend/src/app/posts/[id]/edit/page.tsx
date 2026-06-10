"use client";

import { use, useEffect, useState } from "react";
import PostForm from "@/components/PostForm";
import { api } from "@/lib/api";

export default function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [post, setPost] = useState<any>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    api(`/posts/${id}`).then(setPost).catch(() => setMissing(true));
  }, [id]);

  if (missing) return <main className="mx-auto max-w-4xl px-3 py-4 text-wine sm:px-4 sm:py-8">Beitrag nicht gefunden oder keine Berechtigung.</main>;
  if (!post) return <main className="mx-auto max-w-4xl px-3 py-4 text-wine sm:px-4 sm:py-8">Lade Beitrag...</main>;

  return <PostForm initialPost={post} />;
}
