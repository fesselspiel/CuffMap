"use client";

import { Search, SlidersHorizontal } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { api, Marker } from "@/lib/api";

const LeafletMap = dynamic(() => import("./LeafletMap"), { ssr: false });

export default function CuffMap() {
  const [allMarkers, setAllMarkers] = useState<Marker[]>([]);
  const [product, setProduct] = useState("");
  const [location, setLocation] = useState("");
  const [active, setActive] = useState<Marker | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setAllMarkers(await api<Marker[]>("/map/markers"));
    setLoading(false);
  }

  useEffect(() => {
    load().catch(() => setLoading(false));
  }, []);

  const markers = useMemo(
    () =>
      allMarkers.filter((marker) => {
        const matchesProduct = !product || marker.products.some((item) => String(item.id) === product);
        const matchesLocation = !location || marker.location_label === location;
        return matchesProduct && matchesLocation;
      }),
    [allMarkers, location, product]
  );

  const productOptions = useMemo(() => {
    const options = new Map<number, { id: number; title: string; count: number }>();
    allMarkers
      .filter((marker) => !location || marker.location_label === location)
      .forEach((marker) => {
        marker.products.forEach((item) => {
          const current = options.get(item.id);
          options.set(item.id, {
            id: item.id,
            title: item.title,
            count: (current?.count || 0) + 1,
          });
        });
      });

    return Array.from(options.values()).sort((a, b) => a.title.localeCompare(b.title, "de"));
  }, [allMarkers, location]);

  const locationOptions = useMemo(() => {
    const options = new Map<string, number>();
    allMarkers
      .filter((marker) => !product || marker.products.some((item) => String(item.id) === product))
      .forEach((marker) => {
        if (!marker.location_label) return;
        options.set(marker.location_label, (options.get(marker.location_label) || 0) + 1);
      });

    return Array.from(options.entries()).sort(([a], [b]) => a.localeCompare(b, "de"));
  }, [allMarkers, product]);

  useEffect(() => {
    if (active && !markers.some((marker) => marker.id === active.id)) {
      setActive(null);
    }
  }, [active, markers]);

  return (
    <main className="grid min-h-[calc(100vh-92px)] grid-cols-1 lg:min-h-[calc(100vh-57px)] lg:grid-cols-[380px_1fr]">
      <aside className="order-2 border-b border-line bg-cream/92 p-4 shadow-[12px_0_34px_rgba(116,50,70,0.08)] sm:p-5 lg:order-1 lg:border-b-0 lg:border-r">
        <div className="space-y-3 sm:space-y-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-clay">Community Karte</p>
            <h1 className="text-3xl font-semibold tracking-wide text-wine sm:text-4xl">CuffMap</h1>
            <p className="mt-2 text-sm leading-6 text-ink/70 sm:mt-3">
              Lieblingsorte, kleine Abenteuer und echte Projektfotos auf einer interaktiven Karte.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.16em] text-clay">Produkt</label>
              <div className="flex min-h-11 items-center gap-2 rounded-md border border-line bg-[#fffdf9] px-3 py-2 shadow-sm">
                <Search size={16} className="shrink-0 text-rose" />
                <select
                  value={product}
                  onChange={(event) => setProduct(event.target.value)}
                  className="w-full min-w-0 bg-transparent text-sm outline-none"
                  disabled={loading || productOptions.length === 0}
                >
                  <option value="">Alle Produkte auf der Karte</option>
                  {productOptions.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title} ({item.count})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.16em] text-clay">Standort</label>
              <div className="flex min-h-11 items-center gap-2 rounded-md border border-line bg-[#fffdf9] px-3 py-2 shadow-sm">
                <SlidersHorizontal size={16} className="shrink-0 text-rose" />
                <select
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  className="w-full min-w-0 bg-transparent text-sm outline-none"
                  disabled={loading || locationOptions.length === 0}
                >
                  <option value="">Alle sichtbaren Orte</option>
                  {locationOptions.map(([name, count]) => (
                    <option key={name} value={name}>
                      {name} ({count})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <button onClick={() => load()} className="min-h-11 rounded-md bg-wine px-4 py-2 font-medium text-white shadow-sm hover:bg-rose">
              Aktualisieren
            </button>
            <button
              onClick={() => {
                setProduct("");
                setLocation("");
              }}
              className="min-h-11 rounded-md border border-line bg-[#fffdf9] px-4 py-2 font-medium text-wine shadow-sm hover:bg-blush"
            >
              Zurücksetzen
            </button>
          </div>
          <div className="rounded-md border border-line bg-[#fffdf9]/80 px-3 py-2 text-sm text-ink/70">{loading ? "Lade Marker..." : `${markers.length} Orte sichtbar`}</div>
          {active && (
            <div className="rounded-md border border-line bg-[#fffdf9] p-3 shadow-sm">
              <h2 className="font-semibold text-wine">{active.title}</h2>
              <p className="text-sm text-ink/65">{active.location_label}</p>
              <a className="mt-3 inline-block rounded-md bg-blush px-3 py-2 text-sm font-medium text-wine" href={`/posts/${active.id}`}>
                Beitrag öffnen
              </a>
            </div>
          )}
        </div>
      </aside>
      <section className="cuffmap-home-map order-1 relative border-l border-white/60 bg-[#f4e8e4] p-1 sm:p-2 lg:order-2">
        <LeafletMap markers={markers} onSelect={setActive} />
        {active && (
          <aside className="absolute bottom-3 left-3 right-3 z-[500] max-h-[48vh] overflow-auto rounded-md border border-line bg-cream/95 shadow-[0_18px_45px_rgba(116,50,70,0.18)] backdrop-blur sm:bottom-5 sm:left-auto sm:right-5 sm:w-[min(340px,calc(100%-40px))]">
            {active.thumbnail_url && (
              <div className="relative grid max-h-[26vh] min-h-32 place-items-center overflow-hidden border-b border-line bg-wine/15 sm:max-h-[220px]">
                <img src={active.thumbnail_url} alt="" className="absolute inset-0 h-full w-full scale-110 object-cover blur-xl brightness-75 saturate-125" aria-hidden="true" />
                <div className="absolute inset-0 bg-wine/20" />
                <img src={active.thumbnail_url} alt="" className="relative z-10 h-auto max-h-[26vh] w-auto max-w-full object-contain drop-shadow-[0_14px_28px_rgba(52,36,43,0.28)] sm:max-h-[220px]" />
              </div>
            )}
            <div className="p-3 sm:p-4">
              <h2 className="text-base font-semibold text-wine sm:text-lg">{active.title}</h2>
              <p className="mt-1 line-clamp-2 text-sm leading-5 text-ink/65">{active.location_label}</p>
              {active.products?.[0]?.title && (
                <div className="mt-3 grid grid-cols-[44px_minmax(0,1fr)] items-center gap-2 rounded-md border border-line bg-[#fffdf9]/85 p-2">
                  <span className="h-11 w-11 overflow-hidden rounded-md border border-line bg-sage">
                    {active.products[0].image_url ? <img src={active.products[0].image_url} alt="" className="h-full w-full object-contain" /> : null}
                  </span>
                  <span className="min-w-0 text-sm font-medium text-clay">
                    <span className="block truncate">{active.products[0].title}</span>
                    {active.products[0].shop_url && <span className="block text-xs text-rose">Produkt im Shop</span>}
                  </span>
                </div>
              )}
              <a className="mt-3 inline-block min-h-10 rounded-md bg-wine px-3 py-2 text-sm font-medium text-white hover:bg-rose" href={`/posts/${active.id}`}>
                Beitrag öffnen
              </a>
            </div>
          </aside>
        )}
      </section>
    </main>
  );
}
