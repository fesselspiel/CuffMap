"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { use, useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function AdminProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [product, setProduct] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [visibility, setVisibility] = useState("hidden");
  const [displayTitle, setDisplayTitle] = useState("");
  const [isSelectable, setIsSelectable] = useState(false);
  const [mergeVariants, setMergeVariants] = useState(false);
  const [relevantOptions, setRelevantOptions] = useState<string[]>([]);
  const [ignoredOptions, setIgnoredOptions] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  useEffect(() => {
    setMessage("");
    api<any>(`/admin/shopify/products/${id}`).then((data) => {
      setProduct(data);
      setVisibility(data.visibility || "hidden");
      setDisplayTitle(data.display_title || "");
      setIsSelectable(Boolean(data.is_selectable));
      setMergeVariants(Boolean(data.merge_variants));
      setRelevantOptions(data.relevant_options || []);
      setIgnoredOptions(data.ignored_options || []);
    });
    api<any>("/admin/shopify/products?per_page=200").then((data) => setProducts(data.data || []));
  }, [id]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    const payload = {
      visibility,
      display_title: displayTitle.trim() || null,
      is_selectable: isSelectable,
      merge_variants: mergeVariants,
      relevant_options: relevantOptions,
      ignored_options: ignoredOptions
    };
    try {
      const updated = await api<any>(`/admin/shopify/products/${id}/settings`, { method: "PUT", body: JSON.stringify(payload) });
      setProduct(updated);
      setVisibility(updated.visibility || "hidden");
      setDisplayTitle(updated.display_title || "");
      setIsSelectable(Boolean(updated.is_selectable));
      setMergeVariants(Boolean(updated.merge_variants));
      setRelevantOptions(updated.relevant_options || []);
      setIgnoredOptions(updated.ignored_options || []);
      setMessage("Gespeichert");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Speichern fehlgeschlagen");
    }
  }

  function selectedValues(select: HTMLSelectElement): string[] {
    return Array.from(select.selectedOptions).map((option) => option.value);
  }

  if (!product) return <main className="px-3 py-4 text-wine sm:px-4 sm:py-8">Lade Produkt...</main>;

  const optionNames: string[] = Array.from(new Set<string>((product.variants || []).flatMap((variant: any) => Object.keys(variant.options || {})))).sort();

  return (
    <main className="mx-auto max-w-4xl px-3 py-4 sm:px-4 sm:py-8">
      <form onSubmit={save} className="space-y-4 rounded-md border border-line bg-cream/95 p-4 shadow-[0_18px_45px_rgba(116,50,70,0.10)] sm:space-y-5 sm:p-6">
        <label className="block text-sm font-medium">
          Produkt wechseln
          <select
            value={id}
            onChange={(event) => router.push(`/admin/products/${event.target.value}`)}
            className="mt-1 min-h-11 w-full rounded-md border border-line px-3 py-2"
          >
            {products.map((item) => (
              <option key={item.id} value={item.id}>
                {item.display_title || item.title}
              </option>
            ))}
          </select>
        </label>
        <div className="grid gap-4 sm:grid-cols-[180px_1fr] sm:gap-5">
          <div className="aspect-[16/10] overflow-hidden rounded-md border border-line bg-sage shadow-sm sm:aspect-square">
            {product.image_url ? (
              <img src={product.image_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full place-items-center text-sm text-ink/50">kein Bild</div>
            )}
          </div>
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-clay">Produkt</p>
            <h1 className="text-2xl font-semibold text-wine sm:text-3xl">{displayTitle || product.title}</h1>
            <p className="text-sm text-ink/65">Shopify-Original: {product.title}</p>
            {product.product_type && <p className="text-sm text-ink/65">{product.product_type}</p>}
            {product.shop_url && (
              <a href={product.shop_url} target="_blank" className="inline-block text-sm font-medium text-rose underline">
                Im Shop öffnen
              </a>
            )}
          </div>
        </div>
        <label className="block text-sm font-medium">
          CuffMap-Titel
          <input value={displayTitle} onChange={(event) => setDisplayTitle(event.target.value)} className="mt-1 min-h-11 w-full rounded-md border border-line px-3 py-2" placeholder={product.title} />
        </label>
        <label className="block text-sm font-medium">
          Sichtbarkeit
          <select value={visibility} onChange={(event) => setVisibility(event.target.value)} className="mt-1 min-h-11 w-full rounded-md border border-line px-3 py-2">
            <option value="visible">sichtbar</option>
            <option value="hidden">unsichtbar</option>
            <option value="internal">nur intern</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm text-ink/75"><input type="checkbox" className="h-5 w-5 accent-rose" checked={isSelectable} onChange={(event) => setIsSelectable(event.target.checked)} /> auswählbar</label>
        <label className="flex items-center gap-2 text-sm text-ink/75"><input type="checkbox" className="h-5 w-5 accent-rose" checked={mergeVariants} onChange={(event) => setMergeVariants(event.target.checked)} /> Varianten zusammenfassen</label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-medium">
            Relevante Optionen
            <select value={relevantOptions} onChange={(event) => setRelevantOptions(selectedValues(event.target))} multiple className="mt-1 min-h-28 w-full rounded-md border border-line px-3 py-2">
              {optionNames.map((name) => <option key={name} value={String(name)}>{String(name)}</option>)}
            </select>
          </label>
          <label className="block text-sm font-medium">
            Ignorierte Optionen
            <select value={ignoredOptions} onChange={(event) => setIgnoredOptions(selectedValues(event.target))} multiple className="mt-1 min-h-28 w-full rounded-md border border-line px-3 py-2">
              {optionNames.map((name) => <option key={name} value={String(name)}>{String(name)}</option>)}
            </select>
          </label>
        </div>
        <div className="grid gap-3 sm:flex sm:items-center">
          <button className="min-h-11 rounded-md bg-wine px-4 py-2 text-white shadow-sm hover:bg-rose">Speichern</button>
          {message && <span className="text-sm text-ink/65">{message}</span>}
        </div>
      </form>
      <section className="mt-6 rounded-md border border-line bg-cream/95 shadow-[0_18px_45px_rgba(116,50,70,0.08)]">
        <h2 className="border-b border-line px-4 py-3 text-lg font-semibold text-wine">Varianten</h2>
        {(product.variants || []).slice(0, 80).map((variant: any) => (
          <div key={variant.id} className="grid grid-cols-[48px_1fr] gap-3 border-b border-line px-4 py-3 last:border-b-0">
            <div className="h-12 w-12 overflow-hidden rounded-md border border-line bg-sage">
              {(variant.image_url || product.image_url) ? <img src={variant.image_url || product.image_url} alt="" className="h-full w-full object-cover" /> : null}
            </div>
            <div className="min-w-0">
              <p className="truncate font-medium text-wine">{variant.title}</p>
              <p className="text-xs text-ink/55">{variant.sku || "ohne SKU"} · {variant.visibility} · {variant.is_selectable ? "auswählbar" : "nicht auswählbar"}</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {Object.entries(variant.options || {}).map(([name, value]) => (
                  <span key={name} className="rounded-md bg-blush px-2 py-1 text-xs text-wine">{name}: {String(value)}</span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}
