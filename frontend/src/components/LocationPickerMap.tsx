"use client";

import L from "leaflet";
import { useEffect, useRef } from "react";

const icon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

type Props = {
  latitude: number | null;
  longitude: number | null;
  onChange: (latitude: number, longitude: number) => void;
};

export default function LocationPickerMap({ latitude, longitude, onChange }: Props) {
  const node = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const marker = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!node.current || map.current) return;

    map.current = L.map(node.current, { center: [51.1657, 10.4515], zoom: 6, zoomControl: true });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap"
    }).addTo(map.current);
    map.current.on("click", (event: L.LeafletMouseEvent) => onChange(event.latlng.lat, event.latlng.lng));
    setTimeout(() => map.current?.invalidateSize(), 150);
  }, [onChange]);

  useEffect(() => {
    if (!map.current || latitude === null || longitude === null) return;

    const position: L.LatLngExpression = [latitude, longitude];
    if (!marker.current) {
      marker.current = L.marker(position, { icon, draggable: true }).addTo(map.current);
      marker.current.on("dragend", () => {
        const next = marker.current?.getLatLng();
        if (next) onChange(next.lat, next.lng);
      });
    } else {
      marker.current.setLatLng(position);
    }
    map.current.setView(position, Math.max(map.current.getZoom(), 13));
  }, [latitude, longitude, onChange]);

  return (
    <div className="relative z-0 h-[300px] overflow-hidden rounded-md border border-line shadow-sm sm:h-[360px]">
      <div ref={node} className="absolute inset-0" />
      <div className="pointer-events-none absolute left-2 right-2 top-2 rounded-md border border-line bg-cream/95 px-3 py-2 text-xs text-wine shadow-sm sm:left-3 sm:right-auto sm:top-3">
        In die Karte klicken oder Nadel ziehen
      </div>
    </div>
  );
}
