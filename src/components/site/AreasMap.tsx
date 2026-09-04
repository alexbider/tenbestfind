"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Circle, LatLngBoundsExpression, Map as LeafletMap, Marker } from "leaflet";

export type MapArea = {
  id: string;
  name: string;
  href: string;
  latitude: number;
  longitude: number;
  primary: boolean;
};

/**
 * The areas served, as a map with a chip under it for each place.
 *
 * The design draws this in a sandboxed iframe and talks to it by postMessage;
 * here the map and the chips are in the same document, so hovering a chip can
 * light its pin directly. Leaflet is loaded on demand rather than in the page
 * bundle, because most readers never scroll this far.
 *
 * Only cities that have coordinates are drawn. A city an editor has not
 * positioned yet still gets a chip, so the coverage list stays complete even
 * when the map cannot show every pin.
 */
export function AreasMap({
  areas,
  radiusKm,
  label,
}: {
  areas: MapArea[];
  radiusKm: number | null;
  label: string;
}) {
  const holder = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const pins = useRef<Record<string, Marker>>({});
  const ring = useRef<Circle | null>(null);
  const frame = useRef<LatLngBoundsExpression | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const plotted = useMemo(() => areas.filter((area) => Number.isFinite(area.latitude)), [areas]);

  useEffect(() => {
    if (plotted.length === 0) return;
    let cancelled = false;

    void (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !holder.current || map.current) return;

      const instance = L.map(holder.current, {
        zoomControl: false,
        scrollWheelZoom: false,
        attributionControl: true,
      });
      L.control.zoom({ position: "bottomright" }).addTo(instance);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 18,
      }).addTo(instance);

      const base = plotted.find((area) => area.primary) ?? plotted[0];
      if (radiusKm && base) {
        ring.current = L.circle([base.latitude, base.longitude], {
          radius: radiusKm * 1000,
          color: "#2D74D7",
          weight: 1.5,
          dashArray: "6 6",
          fillColor: "#2D74D7",
          fillOpacity: 0.06,
        }).addTo(instance);
      }

      plotted.forEach((area, index) => {
        const icon = L.divIcon({
          className: "",
          iconSize: [18, 18],
          iconAnchor: [9, 9],
          html:
            `<div class="area-pin${area.primary ? " area-pin--hq" : ""}" data-id="${area.id}" ` +
            `style="animation-delay:${200 + index * 110}ms">` +
            `<span class="area-pin__ring"></span><span class="area-pin__ring area-pin__ring--2"></span>` +
            `<span class="area-pin__dot"></span>` +
            `<span class="area-pin__label">${escapeHtml(area.name)}</span></div>`,
        });
        const pin = L.marker([area.latitude, area.longitude], { icon, keyboard: false }).addTo(
          instance,
        );
        pin.on("mouseover", () => setActive(area.id));
        pin.on("mouseout", () => setActive(null));
        pin.on("click", () => instance.flyTo(pin.getLatLng(), 11, { duration: 0.9 }));
        pins.current[area.id] = pin;
      });

      frame.current = L.latLngBounds(
        plotted.map((area) => [area.latitude, area.longitude] as [number, number]),
      ).pad(0.28);
      instance.fitBounds(frame.current);

      map.current = instance;
      setReady(true);
    })();

    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
      pins.current = {};
    };
  }, [plotted, radiusKm]);

  // The pin markup is Leaflet's, outside React, so the highlight is applied to
  // the DOM rather than re-rendered.
  useEffect(() => {
    if (!ready) return;
    for (const node of document.querySelectorAll<HTMLElement>(".area-pin")) {
      node.classList.toggle("area-pin--on", node.dataset.id === active);
    }
  }, [active, ready]);

  return (
    <>
      <div
        data-mapwrap=""
        style={{
          position: "relative",
          borderRadius: "18px",
          overflow: "hidden",
          border: "1px solid var(--border-subtle)",
          boxShadow: "var(--shadow-sm)",
          background: "#EEF2F8",
          aspectRatio: "16 / 10",
        }}
      >
        <div
          ref={holder}
          role="img"
          aria-label={label}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        />
        {plotted.length > 0 ? (
          <button
            type="button"
            onClick={() => {
              if (map.current && frame.current) map.current.flyToBounds(frame.current, { duration: 0.9 });
            }}
            aria-label="Reset map view"
            style={{
              position: "absolute",
              top: "12px",
              right: "12px",
              zIndex: 400,
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              height: "34px",
              padding: "0 12px",
              border: "1px solid var(--border-subtle)",
              borderRadius: "999px",
              background: "rgba(255,255,255,0.94)",
              fontFamily: "var(--font-sans)",
              fontSize: "12.5px",
              fontWeight: "600",
              color: "var(--blue-900)",
              cursor: "pointer",
              boxShadow: "var(--shadow-xs)",
            }}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
              <path d="M3 3v5h5" />
            </svg>
            All areas
          </button>
        ) : null}
      </div>

      <ul data-arealist="" style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "14px" }}>
        {areas.map((area) => (
          <li key={area.id}>
            <a
              data-areachip=""
              data-on={active === area.id ? "1" : "0"}
              href={area.href}
              onMouseEnter={() => setActive(area.id)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(area.id)}
              onBlur={() => setActive(null)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                minHeight: "40px",
                padding: "0 14px 0 10px",
                border: "1px solid var(--border-subtle)",
                borderRadius: "999px",
                background: "var(--surface-card)",
                fontSize: "14px",
                fontWeight: "600",
                color: "var(--blue-900)",
                textDecoration: "none",
              }}
            >
              <span
                data-areadot=""
                aria-hidden="true"
                style={{
                  width: "9px",
                  height: "9px",
                  borderRadius: "50%",
                  background: area.primary ? "var(--blue-900)" : "var(--color-primary)",
                  boxShadow: `0 0 0 3px ${area.primary ? "rgba(16,31,61,0.15)" : "rgba(45,116,215,0.18)"}`,
                }}
              />
              {area.name}
              {area.primary ? " · HQ" : ""}
            </a>
          </li>
        ))}
      </ul>
    </>
  );
}

/** The pin label goes in through innerHTML, so a city name is escaped first. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
