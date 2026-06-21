export const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "/api";

export type Marker = {
  id: number;
  slug?: string | null;
  title: string;
  latitude: number;
  longitude: number;
  location_label?: string;
  thumbnail_url?: string;
  products: Array<{ id: number; title: string; image_url?: string; shop_url?: string }>;
};

export function postHref(post: { id: number | string; slug?: string | null }, suffix = "") {
  return `/posts/${post.slug || post.id}${suffix}`;
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = typeof window !== "undefined" ? getStoredToken() : null;
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (!(init.body instanceof FormData)) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${API_BASE}${path}`, { ...init, headers, cache: "no-store" });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || `API error ${response.status}`);
  }

  return response.json();
}

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;

  const sessionToken = window.sessionStorage.getItem("cuffmap_token");
  if (sessionToken) return sessionToken;

  const localToken = window.localStorage.getItem("cuffmap_token");
  if (localToken) return localToken;

  const match = document.cookie.match(/(?:^|;\s*)cuffmap_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function storeToken(token: string, remember: boolean) {
  if (remember) {
    window.localStorage.setItem("cuffmap_token", token);
    window.sessionStorage.removeItem("cuffmap_token");
    document.cookie = `cuffmap_token=${encodeURIComponent(token)}; Max-Age=2592000; Path=/; SameSite=Lax`;
    return;
  }

  window.sessionStorage.setItem("cuffmap_token", token);
  window.localStorage.removeItem("cuffmap_token");
  document.cookie = "cuffmap_token=; Max-Age=0; Path=/; SameSite=Lax";
}
