"use client";

import { useEffect, useRef } from "react";
import type { LatLngBoundsExpression, Map as LeafletMap } from "leaflet";

export type CoveragePin = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  /** The place the page is about: drawn darker, and its label stays on. */
  primary?: boolean;
};

/**
 * The service-coverage map the Top 10 page and the city hub draw in a dark
 * card. The design runs Leaflet in an iframe; here it is the same map in the
 * page, loaded on demand because most readers never scroll to it. It draws
 * only places that have coordinates.
 */
export function CoverageMap({ pins, label, height = 440 }: { pins: CoveragePin[]; label: string; height?: number }) {
  const holder = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (pins.length === 0) return;
    let cancelled = false;
    let instance: LeafletMap | null = null;

    void (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !holder.current) return;
      instance = L.map(holder.current, { zoomControl: false, scrollWheelZoom: false, attributionControl: true });
      L.control.zoom({ position: "bottomright" }).addTo(instance);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 18,
      }).addTo(instance);

      pins.forEach((pin, index) => {
        const icon = L.divIcon({
          className: "",
          iconSize: [18, 18],
          iconAnchor: [9, 9],
          html:
            `<div class="area-pin${pin.primary ? " area-pin--hq" : ""}" style="animation-delay:${200 + index * 110}ms">` +
            `<span class="area-pin__ring"></span><span class="area-pin__ring area-pin__ring--2"></span>` +
            `<span class="area-pin__dot"></span>` +
            `<span class="area-pin__label">${escapeHtml(pin.name)}</span></div>`,
        });
        const marker = L.marker([pin.latitude, pin.longitude], { icon, keyboard: false }).addTo(instance!);
        marker.on("click", () => instance?.flyTo(marker.getLatLng(), 11, { duration: 0.9 }));
      });

      const bounds: LatLngBoundsExpression = L.latLngBounds(pins.map((pin) => [pin.latitude, pin.longitude] as [number, number])).pad(0.28);
      instance.fitBounds(bounds, { maxZoom: 11 });
    })();

    return () => {
      cancelled = true;
      instance?.remove();
      instance = null;
    };
  }, [pins]);

  return (
    <div
      ref={holder}
      role="img"
      aria-label={label}
      data-covmap=""
      style={{ display: "block", width: "100%", height: `${height}px`, background: "#EEF2F8" }}
    />
  );
}

/** The pin label goes in through innerHTML, so a place name is escaped first. */
function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
