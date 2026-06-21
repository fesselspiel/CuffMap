"use client";

import { ImagePlus, Instagram, Link as LinkIcon, LocateFixed, MapPin, Plus, Save, Search, Trash2, X } from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { api, API_BASE, getStoredToken, postHref } from "@/lib/api";

type Product = {
  id: number;
  title: string;
  display_title?: string;
  image_url?: string;
  variants?: Array<{ id: number; title: string; sku?: string }>;
  pivot?: { product_variant_id?: number | null };
};
type LocationResult = { display_name: string; lat: string; lon: string; class?: string; category?: string; type?: string; importance?: number };
type InstagramLink = {
  id?: number;
  instagram_media_id?: string | null;
  permalink: string;
  username?: string | null;
  caption?: string | null;
  media_url?: string | null;
  thumbnail_url?: string | null;
  media_type?: string | null;
  media_product_type?: string | null;
  posted_at?: string | null;
  source?: "manual" | "api";
};
type InitialPost = {
  id: number;
  title: string;
  slug?: string | null;
  description?: string | null;
  latitude: number;
  longitude: number;
  location_label?: string | null;
  location_precision?: number | null;
  gps_consent?: boolean;
  images?: Array<{ id: number; path: string; thumbnail_path?: string; width?: number; height?: number }>;
  products?: Product[];
  instagram_links?: InstagramLink[];
};

const LocationPickerMap = dynamic(() => import("./LocationPickerMap"), { ssr: false });

export default function PostForm({ initialPost }: { initialPost?: InitialPost }) {
  const editing = Boolean(initialPost);
  const initialImage = initialPost?.images?.[0];
  const initialProduct = initialPost?.products?.[0];
  const [imageId, setImageId] = useState<number | null>(initialImage?.id || null);
  const [imagePreview, setImagePreview] = useState(initialImage ? `/storage/${initialImage.path}` : "");
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(
    initialImage?.width && initialImage?.height ? { width: initialImage.width, height: initialImage.height } : null
  );
  const [products, setProducts] = useState<Product[]>(initialPost?.products || []);
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(initialProduct ? String(initialProduct.id) : "");
  const [selectedVariant, setSelectedVariant] = useState(initialProduct?.pivot?.product_variant_id ? String(initialProduct.pivot.product_variant_id) : "");
  const [latitude, setLatitude] = useState<number | null>(initialPost?.latitude ?? null);
  const [longitude, setLongitude] = useState<number | null>(initialPost?.longitude ?? null);
  const [locationLabel, setLocationLabel] = useState(initialPost?.location_label || "");
  const [locationQuery, setLocationQuery] = useState("");
  const [locationResults, setLocationResults] = useState<LocationResult[]>([]);
  const [message, setMessage] = useState("");
  const [title, setTitle] = useState(initialPost?.title || "");
  const [slug, setSlug] = useState(initialPost?.slug || "");
  const [description, setDescription] = useState(initialPost?.description || "");
  const [locationPrecision, setLocationPrecision] = useState(initialPost?.location_precision || 100);
  const [gpsConsent, setGpsConsent] = useState(Boolean(initialPost?.gps_consent));
  const [isAdmin, setIsAdmin] = useState(false);
  const [instagramLinks, setInstagramLinks] = useState<InstagramLink[]>(initialPost?.instagram_links || []);
  const [instagramDialogOpen, setInstagramDialogOpen] = useState(false);
  const [instagramUsername, setInstagramUsername] = useState("");
  const [instagramMedia, setInstagramMedia] = useState<InstagramLink[]>([]);
  const [instagramManualUrl, setInstagramManualUrl] = useState("");
  const [instagramMessage, setInstagramMessage] = useState("");
  const [instagramLoading, setInstagramLoading] = useState(false);
  const hasSelectableVariants = (product: Product) => (product.variants?.length || 0) > 0;
  const selectableProducts = products.filter(hasSelectableVariants);
  const currentProduct = selectableProducts.find((product) => String(product.id) === selectedProduct);

  useEffect(() => {
    if (!initialPost) return;
    setTitle(initialPost.title || "");
    setSlug(initialPost.slug || "");
    setDescription(initialPost.description || "");
    setLatitude(initialPost.latitude);
    setLongitude(initialPost.longitude);
    setLocationLabel(initialPost.location_label || "");
    setLocationPrecision(initialPost.location_precision || 100);
    setGpsConsent(Boolean(initialPost.gps_consent));
    setImageId(initialImage?.id || null);
    setImagePreview(initialImage ? `/storage/${initialImage.path}` : "");
    setImageSize(initialImage?.width && initialImage?.height ? { width: initialImage.width, height: initialImage.height } : null);
    setProducts(initialPost.products || []);
    setSelectedProduct(initialProduct && hasSelectableVariants(initialProduct) ? String(initialProduct.id) : "");
    setSelectedVariant(initialProduct && hasSelectableVariants(initialProduct) && initialProduct.pivot?.product_variant_id ? String(initialProduct.pivot.product_variant_id) : "");
    setInstagramLinks(initialPost.instagram_links || []);
  }, [initialPost?.id]);

  useEffect(() => {
    if (getStoredToken()) {
      api<any>("/auth/me").then((user) => setIsAdmin(user.role?.slug === "administrator")).catch(() => setIsAdmin(false));
    }
    api<Product[]>("/products/search?limit=200")
      .then((results) => {
        const selectable = results.filter(hasSelectableVariants);
        const merged = initialProduct && hasSelectableVariants(initialProduct)
          ? [initialProduct, ...selectable.filter((product) => product.id !== initialProduct.id)]
          : selectable;
        setProducts(merged);
      })
      .catch(() => setProducts(initialPost?.products || []));
  }, [initialPost?.id]);

  function coordinateLabel(lat: number, lng: number) {
    return `${lat.toFixed(7)}, ${lng.toFixed(7)}`;
  }

  const setLocation = useCallback((lat: number, lng: number, label?: string) => {
    const nextLat = Number(lat.toFixed(7));
    const nextLng = Number(lng.toFixed(7));
    setLatitude(nextLat);
    setLongitude(nextLng);
    setLocationLabel(label || coordinateLabel(nextLat, nextLng));
  }, []);

  function uploadErrorMessage(error: unknown) {
    const message = error instanceof Error ? error.message : String(error || "");
    if (message.toLowerCase().includes("pattern")) {
      return "Dieses Bild konnte nicht hochgeladen werden. Bitte JPG/JPEG, PNG oder WEBP verwenden.";
    }
    if (message.toLowerCase().includes("failed to upload") || message.toLowerCase().includes("zu groß")) {
      return "Das Bild konnte nicht hochgeladen werden. Bitte JPG/JPEG, PNG oder WEBP bis zur erlaubten Uploadgröße verwenden.";
    }
    return message || "Upload fehlgeschlagen";
  }

  function showLocalPreview(file: File) {
    setImageSize(null);

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      setImagePreview(dataUrl);

      const image = new Image();
      image.onload = () => setImageSize({ width: image.naturalWidth, height: image.naturalHeight });
      image.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }

  async function upload(formData: FormData) {
    const token = getStoredToken();
    const response = await fetch(`${API_BASE}/uploads/image`, {
      method: "POST",
      headers: token ? { Accept: "application/json", Authorization: `Bearer ${token}` } : { Accept: "application/json" },
      body: formData
    });
    const body: { id: number; path: string; width?: number; height?: number; message?: string } = await response.json();
    if (!response.ok) throw new Error(body.message || "Upload fehlgeschlagen");
    setImageId(body.id);
    setImagePreview(`/storage/${body.path}`);
    setImageSize(body.width && body.height ? { width: body.width, height: body.height } : null);
  }

  function sortLocationResults(results: LocationResult[]): LocationResult[] {
    const blockedClasses = new Set(["public_transport", "railway"]);
    const blockedTypes = new Set(["bus_stop", "tram_stop", "platform", "station"]);
    const rank = (result: LocationResult) => {
      const category = result.class || result.category || "";
      if (category === "place") return 0;
      if (category === "boundary" || result.type === "administrative") return 1;
      if (["amenity", "tourism", "leisure", "natural"].includes(category)) return 2;
      if (category === "highway") return 3;
      return 4;
    };

    return results
      .filter((result) => !blockedClasses.has(result.class || result.category || "") && !blockedTypes.has(result.type || ""))
      .sort((a, b) => rank(a) - rank(b) || (b.importance || 0) - (a.importance || 0))
      .slice(0, 6);
  }

  async function searchLocation(query = locationQuery) {
    const term = query.trim();
    if (term.length < 2) {
      setLocationResults([]);
      return;
    }
    setMessage("");
    const params = new URLSearchParams({
      format: "jsonv2",
      addressdetails: "1",
      dedupe: "1",
      limit: "10",
      countrycodes: "de,ch,at",
      "accept-language": "de",
      q: term
    });
    const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`);
    if (!response.ok) {
      setMessage("Standortsuche fehlgeschlagen");
      return;
    }
    setLocationResults(sortLocationResults(await response.json()));
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      searchLocation(locationQuery).catch(() => setMessage("Standortsuche fehlgeschlagen"));
    }, 350);
    return () => window.clearTimeout(timer);
  }, [locationQuery]);

  function useBrowserLocation() {
    setMessage("");
    if (!navigator.geolocation) {
      setMessage("Standortfreigabe ist in diesem Browser nicht verfügbar");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => setLocation(position.coords.latitude, position.coords.longitude),
      () => setMessage("Standort konnte nicht ermittelt werden")
    );
  }

  function normalizeInstagramUrl(value: string) {
    try {
      const url = new URL(value.trim());
      const host = url.hostname.toLowerCase();
      const path = `/${url.pathname.split("/").filter(Boolean).join("/")}/`;
      if (!["instagram.com", "www.instagram.com"].includes(host) || !path.match(/^\/(p|reel|reels|tv)\/[A-Za-z0-9_-]+\//)) {
        return "";
      }
      return `https://www.instagram.com${path}`;
    } catch {
      return "";
    }
  }

  function addInstagramLink(link: InstagramLink) {
    const permalink = normalizeInstagramUrl(link.permalink);
    if (!permalink) {
      setInstagramMessage("Bitte eine genaue Instagram-Post-URL verwenden.");
      return;
    }
    if (instagramLinks.some((item) => normalizeInstagramUrl(item.permalink) === permalink)) {
      setInstagramMessage("Dieser Instagram-Post ist bereits verlinkt.");
      return;
    }
    if (instagramLinks.length >= 10) {
      setInstagramMessage("Maximal 10 Instagram-Posts pro Beitrag.");
      return;
    }
    setInstagramLinks((current) => [...current, { ...link, permalink, source: link.source || "manual" }]);
    setInstagramMessage("");
  }

  function removeInstagramLink(permalink: string) {
    const normalized = normalizeInstagramUrl(permalink);
    setInstagramLinks((current) => current.filter((item) => normalizeInstagramUrl(item.permalink) !== normalized));
  }

  function instagramTypeLabel(link: InstagramLink) {
    if (link.media_product_type === "REELS" || link.permalink.includes("/reel/")) return "Reel";
    if (link.media_type === "VIDEO") return "Video";
    if (link.media_type === "CAROUSEL_ALBUM") return "Album";
    return "Post";
  }

  async function loadInstagramMedia() {
    const username = instagramUsername.trim().replace(/^@/, "");
    if (!username) {
      setInstagramMessage("Bitte einen Instagram-Benutzernamen eingeben.");
      return;
    }

    setInstagramLoading(true);
    setInstagramMessage("");
    try {
      const media = await api<any[]>(`/instagram/user-media?username=${encodeURIComponent(username)}`);
      setInstagramMedia(media.map((item) => ({
        instagram_media_id: item.id,
        permalink: item.permalink,
        username,
        caption: item.caption,
        media_url: item.media_url,
        thumbnail_url: item.thumbnail_url,
        media_type: item.media_type,
        media_product_type: item.media_product_type,
        posted_at: item.timestamp,
        source: "api",
      })));
      if (media.length === 0) setInstagramMessage("Keine Instagram-Beiträge gefunden.");
    } catch (error) {
      setInstagramMedia([]);
      setInstagramMessage(error instanceof Error ? error.message : "Instagram-Suche fehlgeschlagen. Du kannst den Link manuell einfügen.");
    } finally {
      setInstagramLoading(false);
    }
  }

  function addManualInstagramLink() {
    addInstagramLink({ permalink: instagramManualUrl, source: "manual" });
    setInstagramManualUrl("");
  }

  async function submit(formData: FormData) {
    setMessage("");
    if (latitude === null || longitude === null) {
      setMessage("Bitte einen Standort suchen oder auf der Karte auswählen");
      return;
    }
    if (!imageId) {
      setMessage("Bitte zuerst ein Bild hochladen");
      return;
    }
    const payload = {
      title: formData.get("title"),
      description: formData.get("description"),
      latitude,
      longitude,
      location_label: locationLabel,
      location_precision: Number(formData.get("location_precision") || 100),
      gps_consent: formData.get("gps_consent") === "on",
      image_ids: imageId ? [imageId] : [],
      products: selectedProduct ? [{ product_id: Number(selectedProduct), product_variant_id: selectedVariant ? Number(selectedVariant) : null }] : [],
      instagram_links: instagramLinks.map((link) => ({
        instagram_media_id: link.instagram_media_id || null,
        permalink: link.permalink,
        username: link.username || null,
        caption: link.caption || null,
        media_url: link.media_url || null,
        thumbnail_url: link.thumbnail_url || null,
        media_type: link.media_type || null,
        media_product_type: link.media_product_type || null,
        posted_at: link.posted_at || null,
        source: link.source || "manual",
      })),
    };
    if (isAdmin && slug.trim()) {
      Object.assign(payload, { slug: slug.trim() });
    }
    const response = editing
      ? await api<{ id: number }>(`/posts/${initialPost?.id}`, { method: "PUT", body: JSON.stringify(payload) })
      : await api<{ id: number }>("/posts", { method: "POST", body: JSON.stringify(payload) });
    window.location.href = postHref(response);
  }

  return (
    <main className="mx-auto max-w-3xl px-3 py-4 sm:px-4 sm:py-8">
      <form action={submit} className="space-y-4 rounded-md border border-line bg-cream/95 p-4 shadow-[0_18px_45px_rgba(116,50,70,0.10)] sm:space-y-5 sm:p-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-clay">{editing ? "Beitrag bearbeiten" : "Neuer Ort"}</p>
          <h1 className="mt-1 text-2xl font-semibold text-wine sm:text-3xl">{editing ? "Beitrag bearbeiten" : "Beitrag erstellen"}</h1>
        </div>
        <input name="title" required value={title} onChange={(event) => setTitle(event.target.value)} className="min-h-11 w-full rounded-md border border-line px-3 py-2" placeholder="Titel" />
        {isAdmin && (
          <label className="block text-sm font-medium text-wine">
            URL-Slug
            <input value={slug} onChange={(event) => setSlug(event.target.value)} className="mt-1 min-h-11 w-full rounded-md border border-line px-3 py-2" placeholder="wird aus dem Titel generiert" />
            <span className="mt-1 block text-xs text-ink/55">Nur Kleinbuchstaben, Zahlen und Bindestriche.</span>
          </label>
        )}
        <textarea name="description" value={description} onChange={(event) => setDescription(event.target.value)} className="min-h-28 w-full rounded-md border border-line px-3 py-2 sm:min-h-32" placeholder="Beschreibung" />
        <section className="relative space-y-3 rounded-md border border-line bg-[#fffdf9]/78 p-3 shadow-sm">
          <label className="flex items-center gap-2 font-medium text-wine">
            <MapPin size={18} className="text-rose" />
            Standort
          </label>
          <div className="relative z-[1200]">
            <div className="flex min-h-11 flex-1 items-center gap-2 rounded-md border border-line bg-[#fffdf9] px-3 py-2">
              <Search size={17} className="shrink-0 text-rose" />
              <input value={locationQuery} onChange={(event) => setLocationQuery(event.target.value)} className="w-full min-w-0 bg-transparent outline-none" placeholder="Stadt, Adresse oder Ort suchen" />
            </div>
            {locationResults.length > 0 && (
              <div className="absolute left-0 right-0 top-full z-[1300] mt-1 max-h-72 overflow-auto rounded-md border border-line bg-[#fffdf9] shadow-lg">
                {locationResults.map((result) => (
                  <button
                    key={`${result.lat}-${result.lon}-${result.display_name}`}
                    type="button"
                    onClick={() => {
                      setLocation(Number(result.lat), Number(result.lon));
                      setLocationQuery(result.display_name);
                      setLocationResults([]);
                    }}
                    className="block min-h-11 w-full border-b border-line px-3 py-2 text-left text-sm last:border-b-0 hover:bg-blush/60"
                  >
                    {result.display_name}
                  </button>
                ))}
              </div>
            )}
          </div>
          {locationQuery.trim().length >= 2 && locationResults.length === 0 && (
            <p className="text-xs text-ink/55">Keine passenden Ortsvorschläge gefunden. Du kannst die Position direkt auf der Karte setzen.</p>
          )}
          <button type="button" onClick={useBrowserLocation} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-line bg-[#fffdf9] px-3 py-2 text-sm hover:bg-blush/60 sm:w-auto">
            <LocateFixed size={17} className="text-rose" />
            Aktuellen Standort verwenden
          </button>
          <LocationPickerMap latitude={latitude} longitude={longitude} onChange={(lat, lng) => setLocation(lat, lng)} />
          <input value={locationLabel} onChange={(event) => setLocationLabel(event.target.value)} className="min-h-11 w-full rounded-md border border-line px-3 py-2" placeholder="Koordinaten werden automatisch gesetzt; optional eigenen Text eintragen" />
          {latitude !== null && longitude !== null && (
            <p className="text-xs text-ink/55">Gespeicherte Koordinaten: {latitude.toFixed(7)}, {longitude.toFixed(7)}</p>
          )}
        </section>
        <input name="location_precision" type="number" value={locationPrecision} onChange={(event) => setLocationPrecision(Number(event.target.value || 100))} className="min-h-11 w-full rounded-md border border-line px-3 py-2" placeholder="Rundung in Metern" />
        <label className="flex items-start gap-2 text-sm leading-5 text-ink/70">
          <input name="gps_consent" type="checkbox" checked={gpsConsent} onChange={(event) => setGpsConsent(event.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-rose" />
          GPS-Daten aus dem Bild dürfen ausgewertet werden
        </label>
        <div className="rounded-md border border-line bg-[#fffdf9]/78 p-3 shadow-sm">
          <label className="mb-2 flex items-center gap-2 font-medium text-wine">
            <ImagePlus size={18} className="text-rose" />
            Bild
          </label>
          <input
            type="file"
            accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              setMessage("Bild wird hochgeladen...");
              setImageId(null);
              showLocalPreview(file);
              const fd = new FormData();
              fd.set("image", file);
              fd.set("use_exif_gps", "false");
              upload(fd).then(() => setMessage("Bild hochgeladen")).catch((error) => setMessage(uploadErrorMessage(error)));
            }}
          />
          {imagePreview && (
            <figure className="mt-3 overflow-hidden rounded-md border border-line bg-[#fff8f1] shadow-sm">
              <div
                className="grid max-h-[70vh] min-h-[220px] place-items-center bg-[#fffdf9]"
                style={imageSize ? { aspectRatio: `${imageSize.width} / ${imageSize.height}` } : undefined}
              >
                <img
                  src={imagePreview}
                  alt=""
                  className="max-h-[70vh] w-full object-contain"
                  style={imageSize ? { aspectRatio: `${imageSize.width} / ${imageSize.height}` } : undefined}
                />
              </div>
              {imageSize && (
                <figcaption className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-3 py-2 text-xs text-ink/55">
                  <span>{imageSize.width} x {imageSize.height} px</span>
                  <span>{imageSize.width >= imageSize.height ? "Querformat" : "Hochformat"}</span>
                </figcaption>
              )}
            </figure>
          )}
        </div>
        <section className="space-y-3 rounded-md border border-line bg-[#fffdf9]/78 p-3 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <label className="flex items-center gap-2 font-medium text-wine">
              <Instagram size={18} className="text-rose" />
              Instagram-Posts
            </label>
            <button type="button" onClick={() => setInstagramDialogOpen(true)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-line bg-[#fffdf9] px-3 py-2 text-sm font-medium text-wine hover:bg-blush/60">
              <Plus size={16} />
              Verlinken
            </button>
          </div>
          {instagramLinks.length === 0 ? (
            <p className="text-sm text-ink/55">Keine Instagram-Posts verlinkt.</p>
          ) : (
            <div className="grid gap-2">
              {instagramLinks.map((link) => (
                <div key={link.permalink} className="grid grid-cols-[52px_minmax(0,1fr)_auto] items-center gap-3 rounded-md border border-line bg-[#fffdf9] p-2">
                  <span className="grid h-12 w-12 place-items-center overflow-hidden rounded-md border border-line bg-blush text-rose">
                    {link.thumbnail_url || link.media_url ? <img src={link.thumbnail_url || link.media_url || ""} alt="" className="h-full w-full object-cover" /> : <Instagram size={20} />}
                  </span>
                  <span className="min-w-0">
                    <span className="flex min-w-0 flex-wrap items-center gap-2">
                      <span className="truncate font-medium text-wine">{link.username ? `@${link.username}` : "Instagram-Post"}</span>
                      <span className="rounded-md bg-blush px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-rose">{instagramTypeLabel(link)}</span>
                    </span>
                    <a href={link.permalink} target="_blank" className="block truncate text-xs text-rose underline">{link.permalink}</a>
                  </span>
                  <button type="button" onClick={() => removeInstagramLink(link.permalink)} className="grid h-10 w-10 place-items-center rounded-md border border-line text-wine hover:bg-blush" aria-label="Instagram-Link entfernen">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
        <div className="space-y-2">
          <div className="relative">
            <span className="block text-sm font-medium text-wine">Produkt auswählen</span>
            <button
              type="button"
              onClick={() => setProductPickerOpen((current) => !current)}
              disabled={selectableProducts.length === 0}
              className="mt-1 grid w-full grid-cols-[48px_minmax(0,1fr)] items-center gap-3 rounded-md border border-line bg-[#fffdf9] px-3 py-2 text-left shadow-sm disabled:cursor-not-allowed disabled:opacity-60 sm:grid-cols-[56px_1fr_auto]"
            >
              <span className="h-12 w-12 overflow-hidden rounded-md border border-line bg-sage sm:h-14 sm:w-14">
                {currentProduct?.image_url ? <img src={currentProduct.image_url} alt="" className="h-full w-full object-cover" /> : null}
              </span>
              <span className="min-w-0">
                <span className="block truncate font-medium text-wine">{currentProduct ? currentProduct.display_title || currentProduct.title : "Produkt aus Liste wählen"}</span>
                <span className="block text-xs text-ink/55">
                  {currentProduct ? `${currentProduct.variants?.length || 0} auswählbare Varianten` : `${selectableProducts.length} Produkte verfügbar`}
                </span>
              </span>
              <span className="col-span-2 text-sm text-clay sm:col-span-1">{productPickerOpen ? "Schließen" : "Öffnen"}</span>
            </button>
            {productPickerOpen && (
              <div className="absolute left-0 right-0 top-full z-30 mt-2 max-h-[60vh] overflow-auto rounded-md border border-line bg-[#fffdf9] shadow-[0_18px_45px_rgba(116,50,70,0.18)]">
                {selectableProducts.length === 0 && <p className="px-3 py-3 text-sm text-ink/55">Keine freigegebenen Produkte mit auswählbaren Varianten vorhanden.</p>}
                {selectableProducts.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => {
                      setSelectedProduct(String(product.id));
                      setSelectedVariant("");
                      setProductPickerOpen(false);
                    }}
                    className={`grid min-h-20 w-full grid-cols-[56px_minmax(0,1fr)] items-center gap-3 border-b border-line px-3 py-2 text-left last:border-b-0 hover:bg-blush/50 sm:grid-cols-[64px_1fr] ${selectedProduct === String(product.id) ? "bg-blush/70" : ""}`}
                  >
                    <span className="h-14 w-14 overflow-hidden rounded-md border border-line bg-sage sm:h-16 sm:w-16">
                      {product.image_url ? <img src={product.image_url} alt="" className="h-full w-full object-cover" /> : null}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-wine">{product.display_title || product.title}</span>
                      {product.display_title && <span className="block truncate text-xs text-ink/55">Shopify: {product.title}</span>}
                      <span className="block text-xs text-ink/55">{product.variants?.length || 0} auswählbare Varianten</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {currentProduct && (
            <div className="grid grid-cols-[56px_minmax(0,1fr)] items-center gap-3 rounded-md border border-line bg-[#fffdf9] p-3 shadow-sm sm:grid-cols-[64px_1fr]">
              <span className="h-14 w-14 overflow-hidden rounded-md border border-line bg-sage sm:h-16 sm:w-16">
                {currentProduct.image_url ? <img src={currentProduct.image_url} alt="" className="h-full w-full object-cover" /> : null}
              </span>
              <span className="min-w-0">
                <span className="block truncate font-medium text-wine">{currentProduct.display_title || currentProduct.title}</span>
                {currentProduct.display_title && <span className="block truncate text-xs text-ink/55">Shopify: {currentProduct.title}</span>}
                <span className="block text-xs text-ink/55">{currentProduct.variants?.length || 0} auswählbare Varianten</span>
              </span>
            </div>
          )}
          {currentProduct && (currentProduct.variants?.length || 0) > 0 && (
            <label className="block text-sm font-medium">
              Variante / Option
              <select value={selectedVariant} onChange={(e) => setSelectedVariant(e.target.value)} className="mt-1 min-h-11 w-full rounded-md border border-line px-3 py-2">
                <option value="">Keine konkrete Variante</option>
                {currentProduct.variants?.map((variant) => (
                  <option key={variant.id} value={variant.id}>
                    {variant.title}{variant.sku ? ` · ${variant.sku}` : ""}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        <button className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-wine px-4 py-2 font-medium text-white shadow-sm hover:bg-rose sm:w-auto">
          <Save size={18} />
          {editing ? "Speichern" : "Einreichen"}
        </button>
        {message && <p className="text-sm text-ink/65">{message}</p>}
      </form>
      {instagramDialogOpen && (
        <div className="fixed inset-0 z-[2000] grid place-items-end bg-wine/35 p-0 backdrop-blur-sm sm:place-items-center sm:p-4">
          <div className="max-h-[92vh] w-full overflow-auto rounded-t-md border border-line bg-cream p-4 shadow-[0_22px_60px_rgba(52,36,43,0.28)] sm:max-w-3xl sm:rounded-md sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-clay">Instagram</p>
                <h2 className="mt-1 text-xl font-semibold text-wine">Posts verlinken</h2>
              </div>
              <button type="button" onClick={() => setInstagramDialogOpen(false)} className="grid h-10 w-10 place-items-center rounded-md border border-line bg-[#fffdf9] text-wine hover:bg-blush">
                <X size={18} />
              </button>
            </div>

            {instagramLinks.length > 0 && (
              <section className="mt-4 rounded-md border border-line bg-[#fffdf9]/85 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-clay">Ausgewählt</p>
                <div className="mt-2 grid gap-2">
                  {instagramLinks.map((link) => (
                    <div key={link.permalink} className="grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-2 rounded-md border border-line bg-cream/70 p-2">
                      <span className="grid h-11 w-11 place-items-center overflow-hidden rounded-md border border-line bg-blush text-rose">
                        {link.thumbnail_url || link.media_url ? <img src={link.thumbnail_url || link.media_url || ""} alt="" className="h-full w-full object-cover" /> : <Instagram size={18} />}
                      </span>
                      <span className="min-w-0">
                        <span className="flex min-w-0 flex-wrap items-center gap-2">
                          <span className="truncate text-sm font-medium text-wine">{link.username ? `@${link.username}` : "Instagram-Link"}</span>
                          <span className="rounded-md bg-blush px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-rose">{instagramTypeLabel(link)}</span>
                        </span>
                        <a href={link.permalink} target="_blank" className="block truncate text-xs text-rose underline">{link.permalink}</a>
                      </span>
                      <button type="button" onClick={() => removeInstagramLink(link.permalink)} className="grid h-9 w-9 place-items-center rounded-md border border-line text-wine hover:bg-blush" aria-label="Instagram-Link entfernen">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <div className="mt-4 grid gap-3 rounded-md border border-line bg-[#fffdf9]/78 p-3">
              <label className="text-sm font-medium text-wine">
                Instagram-Benutzer suchen
                <div className="mt-1 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <input value={instagramUsername} onChange={(event) => setInstagramUsername(event.target.value)} className="min-h-11 rounded-md border border-line px-3 py-2" placeholder="username oder @username" />
                  <button type="button" onClick={loadInstagramMedia} disabled={instagramLoading} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-wine px-4 py-2 text-white hover:bg-rose disabled:opacity-60">
                    <Search size={16} />
                    {instagramLoading ? "Lade..." : "Suchen"}
                  </button>
                </div>
                <span className="mt-1 block text-xs font-normal text-ink/55">Eigene verknüpfte Konten werden direkt über die gespeicherte Business Account ID gelesen. Fremde Handles benötigen Meta Business Discovery; freie Vorschlagssuche bietet Instagram hier nicht an.</span>
              </label>

              <label className="text-sm font-medium text-wine">
                Oder genaue Post-URL einfügen
                <div className="mt-1 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <input value={instagramManualUrl} onChange={(event) => setInstagramManualUrl(event.target.value)} className="min-h-11 rounded-md border border-line px-3 py-2" placeholder="https://www.instagram.com/p/..." />
                  <button type="button" onClick={addManualInstagramLink} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-line bg-[#fffdf9] px-4 py-2 text-wine hover:bg-blush/60">
                    <LinkIcon size={16} />
                    Hinzufügen
                  </button>
                </div>
              </label>
              {instagramMessage && <p className="text-sm text-clay">{instagramMessage}</p>}
            </div>

            {instagramMedia.length > 0 && (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {instagramMedia.map((item) => {
                  const selected = instagramLinks.some((link) => normalizeInstagramUrl(link.permalink) === normalizeInstagramUrl(item.permalink));
                  return (
                    <button
                      key={item.permalink}
                      type="button"
                      onClick={() => selected ? removeInstagramLink(item.permalink) : addInstagramLink(item)}
                      className={`grid grid-cols-[72px_minmax(0,1fr)] gap-3 rounded-md border p-2 text-left ${selected ? "border-wine bg-blush/70" : "border-line bg-[#fffdf9] hover:bg-blush/45"}`}
                    >
                      <span className="grid aspect-square place-items-center overflow-hidden rounded-md border border-line bg-blush text-rose">
                        {item.thumbnail_url || item.media_url ? <img src={item.thumbnail_url || item.media_url || ""} alt="" className="h-full w-full object-cover" /> : <Instagram size={22} />}
                      </span>
                      <span className="min-w-0">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-wine">{selected ? "Ausgewählt" : "Auswählen"}</span>
                          <span className="rounded-md bg-blush px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-rose">{instagramTypeLabel(item)}</span>
                        </span>
                        <span className="mt-1 block truncate text-xs text-rose">{item.permalink}</span>
                        <span className="mt-1 line-clamp-3 text-xs leading-5 text-ink/60">{item.caption || item.permalink}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
