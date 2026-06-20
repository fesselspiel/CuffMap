"use client";

import { CheckSquare, ClipboardCheck, Eye, EyeOff, RefreshCw, Square } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AdminGuard from "@/components/AdminGuard";
import { api } from "@/lib/api";

type Product = {
  id: number;
  title: string;
  display_title?: string | null;
  image_url?: string | null;
  product_type?: string | null;
  visibility: "visible" | "hidden" | "internal";
  is_selectable: boolean;
  variants_count: number;
};

const visibilityLabels: Record<Product["visibility"], string> = {
  visible: "sichtbar",
  hidden: "unsichtbar",
  internal: "intern",
};

function AdminPageContent() {
  const [products, setProducts] = useState<Product[]>([]);
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [visibilityAction, setVisibilityAction] = useState("visible");
  const [selectableAction, setSelectableAction] = useState("no_change");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  function load() {
    api<any>("/admin/shopify/products")
      .then((data) => {
        setProducts(data.data || []);
        setMessage("");
      })
      .catch((error) => setMessage(error.message));
  }

  useEffect(load, []);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const visibleCount = products.filter((product) => product.visibility === "visible").length;
  const selectableCount = products.filter((product) => product.is_selectable).length;
  const allOnPageSelected = products.length > 0 && selectedIds.length === products.length;

  function toggleProduct(id: number) {
    setSelectedIds((current) => (
      current.includes(id) ? current.filter((selectedId) => selectedId !== id) : [...current, id]
    ));
  }

  function toggleAllOnPage() {
    setSelectedIds(allOnPageSelected ? [] : products.map((product) => product.id));
  }

  async function applyBulkUpdate() {
    if (selectedIds.length === 0) {
      setMessage("Bitte zuerst Produkte auswaehlen.");
      return;
    }

    const body: Record<string, unknown> = { product_ids: selectedIds };
    if (visibilityAction !== "no_change") body.visibility = visibilityAction;
    if (selectableAction !== "no_change") body.is_selectable = selectableAction === "selectable";

    if (!body.visibility && body.is_selectable === undefined) {
      setMessage("Bitte mindestens eine Bulk-Aenderung auswaehlen.");
      return;
    }

    setIsSaving(true);
    setMessage("");
    try {
      const result = await api<{ updated: number }>("/admin/shopify/products/bulk-settings", {
        method: "PUT",
        body: JSON.stringify(body),
      });
      setMessage(`${result.updated} Produkte aktualisiert.`);
      setSelectedIds([]);
      load();
    } catch (error: any) {
      setMessage(error.message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-3 py-4 sm:px-4 sm:py-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-clay">CuffMap Pflege</p>
          <h1 className="mt-1 text-2xl font-semibold text-wine sm:text-3xl">Admin Dashboard</h1>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
          <button
            onClick={() => {
              setBulkMode((current) => !current);
              setSelectedIds([]);
            }}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-line bg-cream px-3 py-2 text-wine shadow-sm hover:bg-blush"
          >
            {bulkMode ? <CheckSquare size={16} /> : <Square size={16} />}
            Bulk Edit
          </button>
          <button
            onClick={() => api("/admin/shopify/sync", { method: "POST" }).then(load)}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-wine px-3 py-2 text-white shadow-sm hover:bg-rose"
          >
            <RefreshCw size={16} />
            Shopify Sync
          </button>
        </div>
      </div>

      {message && <p className="mt-3 text-sm text-clay">{message}</p>}

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-md border border-line bg-cream/90 px-4 py-3 shadow-sm">
          <p className="text-xs uppercase tracking-[0.16em] text-ink/45">Produkte</p>
          <p className="mt-1 text-2xl font-semibold text-wine">{products.length}</p>
        </div>
        <div className="rounded-md border border-line bg-cream/90 px-4 py-3 shadow-sm">
          <p className="text-xs uppercase tracking-[0.16em] text-ink/45">Sichtbar</p>
          <p className="mt-1 text-2xl font-semibold text-wine">{visibleCount}</p>
        </div>
        <div className="rounded-md border border-line bg-cream/90 px-4 py-3 shadow-sm">
          <p className="text-xs uppercase tracking-[0.16em] text-ink/45">Auswaehlbar</p>
          <p className="mt-1 text-2xl font-semibold text-wine">{selectableCount}</p>
        </div>
      </div>

      <Link href="/admin/moderation" className="mt-5 flex flex-col gap-1 rounded-md border border-line bg-blush/70 px-4 py-3 text-wine shadow-sm hover:bg-blush sm:flex-row sm:items-center sm:justify-between">
        <span className="inline-flex items-center gap-2 font-medium">
          <ClipboardCheck size={18} />
          Moderationsuebersicht
        </span>
        <span className="text-sm text-ink/65 sm:text-wine">Beitraege pruefen und freigeben</span>
      </Link>

      {bulkMode && (
        <div className="mt-5 grid gap-3 rounded-md border border-wine/20 bg-blush/65 px-4 py-3 shadow-sm sm:flex sm:flex-wrap sm:items-end">
          <button
            onClick={toggleAllOnPage}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-line bg-cream px-3 py-2 text-sm font-medium text-wine hover:bg-white"
          >
            {allOnPageSelected ? <CheckSquare size={16} /> : <Square size={16} />}
            Alle auf Seite
          </button>
          <label className="text-sm text-ink/70">
            Sichtbarkeit
            <select value={visibilityAction} onChange={(event) => setVisibilityAction(event.target.value)} className="mt-1 block min-h-11 w-full rounded-md border border-line bg-cream px-3 py-2 text-wine">
              <option value="visible">auf sichtbar setzen</option>
              <option value="hidden">auf unsichtbar setzen</option>
              <option value="internal">auf intern setzen</option>
              <option value="no_change">nicht aendern</option>
            </select>
          </label>
          <label className="text-sm text-ink/70">
            Auswahl
            <select value={selectableAction} onChange={(event) => setSelectableAction(event.target.value)} className="mt-1 block min-h-11 w-full rounded-md border border-line bg-cream px-3 py-2 text-wine">
              <option value="no_change">nicht aendern</option>
              <option value="selectable">auswaehlbar machen</option>
              <option value="not_selectable">nicht auswaehlbar machen</option>
            </select>
          </label>
          <button
            onClick={applyBulkUpdate}
            disabled={isSaving || selectedIds.length === 0}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-wine px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-rose disabled:cursor-not-allowed disabled:opacity-50"
          >
            Auswahl anwenden ({selectedIds.length})
          </button>
        </div>
      )}

      <div className="mt-5 overflow-hidden rounded-md border border-line bg-cream/95 shadow-[0_18px_45px_rgba(116,50,70,0.10)]">
        {products.map((product) => (
          <div key={product.id} className="grid grid-cols-[auto_52px_minmax(0,1fr)] items-center gap-3 border-b border-line px-3 py-3 last:border-b-0 hover:bg-blush/45 sm:px-4 md:grid-cols-[auto_56px_minmax(0,1fr)_auto_auto_auto]">
            {bulkMode ? (
              <button
                onClick={() => toggleProduct(product.id)}
                className="grid h-11 w-11 place-items-center rounded-md border border-line bg-white text-wine hover:bg-blush"
                aria-label={`${product.display_title || product.title} auswaehlen`}
              >
                {selectedSet.has(product.id) ? <CheckSquare size={18} /> : <Square size={18} />}
              </button>
            ) : (
              <span className="h-11 w-11" />
            )}
            <span className="grid h-12 w-12 place-items-center overflow-hidden rounded-md border border-line bg-sage text-xs text-ink/50 sm:h-14 sm:w-14">
              {product.image_url ? (
                <img src={product.image_url} alt="" className="h-full w-full object-cover" />
              ) : (
                "kein Bild"
              )}
            </span>
            <span className="min-w-0">
              <span className="block truncate font-medium text-wine">{product.display_title || product.title}</span>
              {product.display_title && <span className="block truncate text-xs text-ink/55">Shopify: {product.title}</span>}
              {product.product_type && <span className="block truncate text-xs text-ink/55">{product.product_type}</span>}
            </span>
            <span className={`col-span-3 inline-flex w-fit items-center gap-1 rounded-md px-2 py-1 text-xs md:col-span-1 ${product.visibility === "visible" ? "bg-sage text-ink" : "bg-blush text-wine"}`}>
              {product.visibility === "visible" ? <Eye size={13} /> : <EyeOff size={13} />}
              {visibilityLabels[product.visibility]}
            </span>
            <span className={`col-span-3 w-fit rounded-md px-2 py-1 text-xs md:col-span-1 ${product.is_selectable ? "bg-sage text-ink" : "bg-blush text-wine"}`}>
              {product.is_selectable ? "auswaehlbar" : "nicht auswaehlbar"}
            </span>
            <div className="col-span-3 grid gap-2 sm:flex sm:items-center sm:justify-between md:col-span-1">
              <span className="text-sm text-ink/65">{product.variants_count} Varianten</span>
              <Link href={`/admin/products/${product.id}`} className="inline-flex min-h-10 items-center justify-center rounded-md border border-line bg-white px-3 py-2 text-sm font-medium text-wine hover:bg-blush">
                Oeffnen
              </Link>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

export default function AdminPage() {
  return (
    <AdminGuard allowedRoles={["administrator"]}>
      <AdminPageContent />
    </AdminGuard>
  );
}
