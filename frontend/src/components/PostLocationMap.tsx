"use client";

import L from "leaflet";
import { useEffect, useRef } from "react";

const icon = L.divIcon({
  className: "cuffmap-pin",
  html: "<span></span>",
  iconSize: [28, 36],
  iconAnchor: [14, 34],
  popupAnchor: [0, -30],
});

type Props = {
  latitude: number;
  longitude: number;
  label?: string | null;
};

export default function PostLocationMap({ latitude, longitude, label }: Props) {
  const node = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!node.current || map.current) return;

    const position: L.LatLngExpression = [latitude, longitude];
    map.current = L.map(node.current, {
      center: position,
      zoom: 13,
      zoomControl: true,
      scrollWheelZoom: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap",
    }).addTo(map.current);

    L.marker(position, { icon })
      .addTo(map.current)
      .bindPopup(label || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);

    setTimeout(() => map.current?.invalidateSize(), 150);
  }, [label, latitude, longitude]);

  return <div ref={node} className="h-full min-h-[260px] w-full" />;
}
