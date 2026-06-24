"use client";

import L from "leaflet";
import "leaflet.markercluster";
import { useEffect, useRef } from "react";
import { Marker } from "@/lib/api";

const DEFAULT_CENTER: L.LatLngExpression = [51.1657, 10.4515];
const DEFAULT_ZOOM = 6;

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char] || char);
}

function markerIcon(item: Marker) {
  const imageUrl = item.products?.[0]?.image_url || item.thumbnail_url;

  if (imageUrl) {
    return L.divIcon({
      className: "cuffmap-photo-pin",
      html: `<span><img src="${escapeHtml(imageUrl)}" alt=""></span>`,
      iconSize: [58, 68],
      iconAnchor: [29, 64],
      popupAnchor: [0, -58]
    });
  }

  return L.divIcon({
    className: "cuffmap-pin",
    html: "<span></span>",
    iconSize: [28, 36],
    iconAnchor: [14, 34],
    popupAnchor: [0, -30]
  });
}

function clusterIcon(cluster: any) {
  const childMarkers = cluster.getAllChildMarkers?.() || [];
  const firstProductImage = childMarkers.find((marker: any) => marker.options?.cuffmapProductImageUrl)?.options?.cuffmapProductImageUrl;
  const firstImage = firstProductImage || childMarkers.find((marker: any) => marker.options?.cuffmapImageUrl)?.options?.cuffmapImageUrl;
  const count = cluster.getChildCount?.() || childMarkers.length;

  if (firstImage) {
    return L.divIcon({
      className: "cuffmap-product-cluster",
      html: `<span><img src="${escapeHtml(firstImage)}" alt=""><b>${count}</b></span>`,
      iconSize: [64, 74],
      iconAnchor: [32, 70],
    });
  }

  return L.divIcon({
    className: "cuffmap-product-cluster cuffmap-product-cluster-empty",
    html: `<span><b>${count}</b></span>`,
    iconSize: [54, 64],
    iconAnchor: [27, 60],
  });
}

export default function LeafletMap({ markers, onSelect, onClear }: { markers: Marker[]; onSelect: (marker: Marker) => void; onClear?: () => void }) {
  const node = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const cluster = useRef<any>(null);
  const markerBounds = useRef<L.LatLngBounds | null>(null);
  const onClearRef = useRef(onClear);

  onClearRef.current = onClear;

  function zoomHome() {
    if (!map.current) return;
    if (markerBounds.current?.isValid()) {
      map.current.fitBounds(markerBounds.current, { padding: [42, 42], maxZoom: 13 });
      return;
    }
    map.current.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
  }

  useEffect(() => {
    if (!node.current || map.current) return;
    map.current = L.map(node.current, { center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM, doubleClickZoom: false, zoomControl: false });
    L.control.zoom({ position: "topleft" }).addTo(map.current);

    const HomeControl = L.Control.extend({
      options: { position: "topleft" },
      onAdd: () => {
        const container = L.DomUtil.create("div", "leaflet-bar cuffmap-home-control");
        const button = L.DomUtil.create("button", "", container);
        button.type = "button";
        button.title = "Alle Orte anzeigen";
        button.setAttribute("aria-label", "Alle Orte anzeigen");
        button.innerHTML = "H";
        L.DomEvent.disableClickPropagation(container);
        L.DomEvent.on(button, "click", (event) => {
          L.DomEvent.stop(event);
          onClearRef.current?.();
          map.current?.closePopup();
          zoomHome();
        });
        return container;
      },
    });
    new HomeControl().addTo(map.current);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap"
    }).addTo(map.current);
    cluster.current = (L as any).markerClusterGroup({
      iconCreateFunction: clusterIcon,
    });
    map.current.addLayer(cluster.current);
    map.current.on("click", (event: L.LeafletMouseEvent) => {
      const target = event.originalEvent.target as HTMLElement | null;
      if (target?.closest(".leaflet-marker-icon, .leaflet-marker-shadow, .leaflet-popup, .leaflet-control")) return;
      onClearRef.current?.();
      map.current?.closePopup();
    });
    map.current.on("dblclick", () => {
      onClearRef.current?.();
      map.current?.closePopup();
      zoomHome();
    });
    setTimeout(() => map.current?.invalidateSize(), 150);
    setTimeout(() => map.current?.invalidateSize(), 500);
  }, []);

  useEffect(() => {
    if (!cluster.current || !map.current) return;
    cluster.current.clearLayers();
    const bounds: L.LatLngExpression[] = [];
    markers.forEach((item) => {
      const productImage = item.products?.[0]?.image_url;
      const markerImage = productImage || item.thumbnail_url;
      const marker = L.marker([item.latitude, item.longitude], { icon: markerIcon(item), cuffmapImageUrl: markerImage, cuffmapProductImageUrl: productImage } as any);
      bounds.push([item.latitude, item.longitude]);
      const popupImage = item.products?.[0]?.image_url || item.thumbnail_url;
      const image = popupImage ? `<img src="${escapeHtml(popupImage)}" alt="">` : "";
      const product = item.products?.[0]?.title ? `<div>${escapeHtml(item.products[0].title)}</div>` : "";
      marker.bindPopup(`<div class="map-popup">${image}<strong>${escapeHtml(item.title)}</strong>${product}</div>`);
      marker.on("click", (event: L.LeafletMouseEvent) => {
        L.DomEvent.stopPropagation(event);
        onSelect(item);
      });
      cluster.current?.addLayer(marker);
    });
    markerBounds.current = bounds.length ? L.latLngBounds(bounds) : null;
    map.current.invalidateSize();
    if (bounds.length === 1) {
      map.current.setView(bounds[0], 13);
    } else if (bounds.length > 1) {
      map.current.fitBounds(L.latLngBounds(bounds), { padding: [42, 42], maxZoom: 13 });
    }
  }, [markers, onSelect]);

  return <div ref={node} className="cuffmap-leaflet-root" />;
}
