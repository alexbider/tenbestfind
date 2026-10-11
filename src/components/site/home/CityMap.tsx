"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { LatLngBounds, Map as LeafletMap, LayerGroup, Marker } from "leaflet";

export type MapCity = {
  /** The city's page, which doubles as its key. */
  href: string;
  name: string;
  /** Published rankings in this city. Zero means no list yet. */
  count: number;
  lat: number | null;
  lng: number | null;
};

export type MapCountry = {
  code: string;
  label: string;
  browseHref: string;
  browseLabel: string;
  cities: MapCity[];
};

function tagFor(count: number) {
  return count > 0 ? (count === 1 ? "1 list" : `${count} lists`) : "Coming soon";
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * "Start with your city": a map of the metros with the most rankings and a
 * panel beside it that lists them. Hovering a city lights its pin and flies to
 * it; the country switch swaps the pins; the filter narrows the list.
 *
 * The design draws the map in an iframe and talks to it by postMessage. Here
 * the map and the panel share a document, so the panel drives Leaflet directly.
 * Leaflet is loaded on demand, since most readers never scroll this far, and
 * the tiles are the same OpenStreetMap ones the area maps use.
 */
export function CityMap({ countries }: { countries: MapCountry[] }) {
  const [code, setCode] = useState(countries[0]?.code ?? "us");
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const holder = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const layers = useRef<Record<string, LayerGroup>>({});
  const bounds = useRef<Record<string, LatLngBounds>>({});
  const markers = useRef<Record<string, Marker>>({});
  const coords = useRef<Record<string, { lat: number; lng: number }>>({});
  const current = useRef(code);
  const padLeft = useRef(0);
  const timers = useRef<{ focus?: number; reset?: number; pad?: number }>({});

  const country = countries.find((c) => c.code === code) ?? countries[0];
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (country?.cities ?? []).filter((city) => !q || city.name.toLowerCase().includes(q));
  }, [country, query]);

  useEffect(() => {
    let cancelled = false;
    const holderEl = holder.current;

    void (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !holderEl || map.current) return;

      const instance = L.map(holderEl, {
        zoomControl: false,
        scrollWheelZoom: false,
        attributionControl: true,
        zoomSnap: 0.25,
        worldCopyJump: true,
      });
      L.control.zoom({ position: "bottomright" }).addTo(instance);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 18,
      }).addTo(instance);

      const fit = (extra?: object) => {
        const frame = bounds.current[current.current];
        if (!frame) return;
        const pad = padLeft.current
          ? { paddingTopLeft: [padLeft.current, 40] as [number, number], paddingBottomRight: [40, 40] as [number, number] }
          : { padding: [28, 28] as [number, number] };
        instance.fitBounds(frame, { ...pad, ...extra });
      };
      (instance as unknown as { __fit: typeof fit }).__fit = fit;

      for (const c of countries) {
        const group = L.layerGroup();
        const located = c.cities.filter((city) => city.lat != null && city.lng != null);
        if (located.length > 0) {
          bounds.current[c.code] = L.latLngBounds(located.map((city) => [city.lat as number, city.lng as number]));
        }
        located.forEach((city, i) => {
          const lat = city.lat as number;
          const lng = city.lng as number;
          coords.current[city.href] = { lat, lng };
          const tag = tagFor(city.count);
          const live = city.count > 0;
          const icon = L.divIcon({
            className: "",
            iconSize: [28, 28],
            iconAnchor: [14, 14],
            popupAnchor: [0, -12],
            html:
              `<div class="hm-pin drop ${live ? "live" : "soon"}" data-id="${escapeHtml(city.href)}" style="animation-delay:${120 + i * 80}ms">` +
              `<span class="ring"></span><span class="ring r2"></span><span class="dot">${live ? city.count : ""}</span>` +
              `<span class="lbl">${escapeHtml(city.name)}<b>${escapeHtml(tag)}</b></span></div>`,
          });
          const marker = L.marker([lat, lng], { icon, keyboard: false, riseOnHover: true });
          const place = city.name.split(", ")[0];
          const state = city.name.split(", ")[1] ?? "";
          marker.bindPopup(
            `<div class="hm-pc"><small>${live ? `${escapeHtml(tag)} live` : "In research"}${state ? ` · ${escapeHtml(state)}` : ""}</small>` +
              `<strong>${escapeHtml(city.name)}</strong>` +
              (live
                ? `<a href="${escapeHtml(city.href)}">Open ${escapeHtml(place)} lists &rarr;</a>`
                : `<span class="soon">Lists coming soon</span>`) +
              `</div>`,
            { closeButton: true, autoPanPaddingTopLeft: [padLeft.current + 20, 20] },
          );
          marker.on("click", () => setActive(city.href));
          marker.on("mouseover", () => setActive(city.href));
          marker.on("mouseout", () => setActive(null));
          marker.addTo(group);
          markers.current[city.href] = marker;
        });
        layers.current[c.code] = group;
      }

      const start = layers.current[current.current];
      if (start) start.addTo(instance);
      const p = panel.current;
      padLeft.current = p && getComputedStyle(p).position === "absolute" ? p.offsetWidth + 40 : 0;
      if (bounds.current[current.current]) fit();
      else instance.setView([39.5, -98.35], 4);

      map.current = instance;
      setReady(true);
    })();

    const onResize = () => {
      window.clearTimeout(timers.current.pad);
      timers.current.pad = window.setTimeout(() => {
        const instance = map.current;
        if (!instance) return;
        const p = panel.current;
        const next = p && getComputedStyle(p).position === "absolute" ? p.offsetWidth + 40 : 0;
        instance.invalidateSize();
        if (next !== padLeft.current) {
          padLeft.current = next;
          (instance as unknown as { __fit?: () => void }).__fit?.();
        }
      }, 200);
    };
    window.addEventListener("resize", onResize);

    const pending = timers.current;
    return () => {
      cancelled = true;
      window.removeEventListener("resize", onResize);
      window.clearTimeout(pending.focus);
      window.clearTimeout(pending.reset);
      window.clearTimeout(pending.pad);
      map.current?.remove();
      map.current = null;
      layers.current = {};
      bounds.current = {};
      markers.current = {};
      coords.current = {};
      setReady(false);
    };
  }, [countries]);

  // The pin markup is Leaflet's, outside React, so the highlight is set on the DOM.
  useEffect(() => {
    if (!ready) return;
    for (const node of holder.current?.querySelectorAll<HTMLElement>(".hm-pin") ?? []) {
      node.classList.toggle("on", node.dataset.id === active);
    }
    for (const [id, marker] of Object.entries(markers.current)) {
      marker.getElement()?.classList.toggle("zon", id === active);
    }
  }, [active, ready]);

  function switchCountry(next: string) {
    if (next === code) return;
    setCode(next);
    setActive(null);
    setQuery("");
    const instance = map.current;
    if (!instance || !layers.current[next]) {
      current.current = next;
      return;
    }
    instance.closePopup();
    const old = layers.current[current.current];
    if (old) instance.removeLayer(old);
    current.current = next;
    layers.current[next].addTo(instance);
    const frame = bounds.current[next];
    if (frame) {
      const pad = padLeft.current
        ? { paddingTopLeft: [padLeft.current, 40] as [number, number], paddingBottomRight: [40, 40] as [number, number] }
        : { padding: [28, 28] as [number, number] };
      instance.flyToBounds(frame, { ...pad, duration: 1.3 });
    }
  }

  function enter(href: string) {
    window.clearTimeout(timers.current.focus);
    window.clearTimeout(timers.current.reset);
    setActive(href);
    const at = coords.current[href];
    const instance = map.current;
    if (!at || !instance) return;
    timers.current.focus = window.setTimeout(() => {
      void import("leaflet").then(({ default: L }) => {
        const pad = padLeft.current
          ? { paddingTopLeft: [padLeft.current, 40] as [number, number], paddingBottomRight: [40, 40] as [number, number] }
          : { padding: [28, 28] as [number, number] };
        instance.flyToBounds(L.latLng(at.lat, at.lng).toBounds(260000), { ...pad, duration: 0.9, maxZoom: 7 });
      });
    }, 260);
  }

  function leave() {
    window.clearTimeout(timers.current.focus);
    setActive(null);
    timers.current.reset = window.setTimeout(() => {
      const instance = map.current;
      const frame = bounds.current[current.current];
      if (!instance || !frame) return;
      instance.closePopup();
      const pad = padLeft.current
        ? { paddingTopLeft: [padLeft.current, 40] as [number, number], paddingBottomRight: [40, 40] as [number, number] }
        : { padding: [28, 28] as [number, number] };
      instance.flyToBounds(frame, { ...pad, duration: 1.1 });
    }, 380);
  }

  if (!country) return null;

  const hasSoon = countries.some((c) => c.cities.some((city) => city.count === 0));

  return (
    <div
      data-mapwrap=""
      data-reveal=""
      style={{
        position: "relative",
        borderRadius: "28px",
        overflow: "hidden",
        background: "var(--ink)",
        boxShadow: "0 50px 90px -50px rgba(16,31,61,0.75)",
      }}
    >
      <div data-mapbox="" style={{ position: "relative" }}>
        <div
          ref={holder}
          data-mapframe=""
          role="img"
          aria-label="Interactive map of covered cities in the United States and Canada"
          style={{ display: "block", width: "100%", height: "380px", border: "0" }}
        />
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: "0",
            boxShadow: "inset 0 0 90px rgba(13,26,52,0.75)",
            pointerEvents: "none",
            zIndex: 500,
          }}
        />
        <div
          data-maplegend=""
          aria-hidden="true"
          style={{
            position: "absolute",
            right: "14px",
            top: "14px",
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "flex-end",
            gap: "6px",
            pointerEvents: "none",
            zIndex: 600,
          }}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "7px",
              height: "30px",
              padding: "0 11px",
              borderRadius: "999px",
              background: "rgba(16,31,61,0.85)",
              backdropFilter: "blur(8px)",
              border: "1px solid rgba(255,255,255,0.12)",
              fontSize: "11.5px",
              fontWeight: "700",
              color: "#fff",
            }}
          >
            <span
              data-live-dot=""
              style={{ width: "9px", height: "9px", borderRadius: "50%", background: "var(--gold-ink)" }}
            />
            Lists live
          </span>
          {hasSoon ? (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "7px",
                height: "30px",
                padding: "0 11px",
                borderRadius: "999px",
                background: "rgba(16,31,61,0.85)",
                backdropFilter: "blur(8px)",
                border: "1px solid rgba(255,255,255,0.12)",
                fontSize: "11.5px",
                fontWeight: "700",
                color: "rgba(232,237,245,0.85)",
              }}
            >
              <span
                style={{ width: "9px", height: "9px", borderRadius: "50%", border: "2px solid rgba(232,237,245,0.8)" }}
              />
              Coming soon
            </span>
          ) : null}
        </div>
      </div>

      <div
        data-mappanel=""
        ref={panel}
        style={{ position: "relative", background: "var(--surface-card)", padding: "16px", zIndex: 600 }}
      >
        <div
          data-seg=""
          data-c={code === countries[1]?.code ? "ca" : "us"}
          role="group"
          aria-label="Country"
          style={{
            position: "relative",
            display: "grid",
            gridTemplateColumns: `repeat(${countries.length}, 1fr)`,
            padding: "4px",
            borderRadius: "16px",
            background: "var(--paper)",
            border: "1px solid var(--border-subtle)",
            marginBottom: "10px",
          }}
        >
          <span
            data-seg-pill=""
            aria-hidden="true"
            style={{
              position: "absolute",
              left: "4px",
              top: "4px",
              bottom: "4px",
              width: `calc(${100 / countries.length}% - 4px)`,
              borderRadius: "12px",
              background: "var(--ink)",
            }}
          />
          {countries.map((c) => (
            <button
              key={c.code}
              type="button"
              aria-pressed={c.code === code}
              onClick={() => switchCountry(c.code)}
              style={{
                height: "44px",
                border: "0",
                borderRadius: "12px",
                background: "transparent",
                fontSize: "14px",
                fontWeight: "700",
                color: "var(--text-secondary)",
                cursor: "pointer",
              }}
            >
              {c.label}
            </button>
          ))}
        </div>

        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            height: "46px",
            padding: "0 14px",
            borderRadius: "14px",
            border: "1px solid var(--border-subtle)",
            background: "var(--paper)",
            marginBottom: "6px",
          }}
        >
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--gray-400)"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.34-4.34" />
          </svg>
          <span
            style={{ position: "absolute", width: "1px", height: "1px", overflow: "hidden", clip: "rect(0 0 0 0)" }}
          >
            Filter cities
          </span>
          <input
            type="search"
            placeholder="Filter cities"
            autoComplete="off"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            style={{
              flex: "1",
              minWidth: "0",
              height: "44px",
              border: "0",
              outline: "none",
              background: "transparent",
              fontSize: "16px",
              color: "var(--text-primary)",
            }}
          />
        </label>

        <ol
          data-cities=""
          onMouseLeave={leave}
          style={{ display: "grid", gridTemplateColumns: "1fr", gap: "0" }}
        >
          {shown.map((city) => {
            const live = city.count > 0;
            return (
              <li key={city.href} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                <Link
                  data-row=""
                  data-city=""
                  data-active={active === city.href ? "1" : "0"}
                  href={city.href}
                  onMouseEnter={() => enter(city.href)}
                  onFocus={() => enter(city.href)}
                  onBlur={leave}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    minHeight: "46px",
                    padding: "0 10px",
                    fontSize: "15px",
                    fontWeight: "600",
                    color: "var(--ink)",
                    borderRadius: "10px",
                  }}
                >
                  <span
                    data-cdot=""
                    aria-hidden="true"
                    style={{
                      width: "9px",
                      height: "9px",
                      borderRadius: "50%",
                      flexShrink: 0,
                      background: live ? "var(--gold-ink)" : "transparent",
                      border: live ? "0" : "1.5px solid var(--gray-400)",
                    }}
                  />
                  <span style={{ flex: "1" }}>{city.name}</span>
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: "700",
                      color: live ? "var(--gold)" : "var(--text-muted)",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {tagFor(city.count)}
                  </span>
                  <svg
                    data-arrow=""
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--gray-400)"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="m9 6 6 6-6 6" />
                  </svg>
                </Link>
              </li>
            );
          })}
        </ol>
        {countries
          .filter((other) => other.code !== code)
          .map((other) => (
            <ol key={other.code} hidden aria-label={`${other.label} cities`}>
              {other.cities.map((city) => (
                <li key={city.href}>
                  <Link href={city.href}>{city.name}</Link>
                </li>
              ))}
            </ol>
          ))}
        {shown.length === 0 ? (
          <p style={{ padding: "18px 10px", fontSize: "14px", lineHeight: "1.5", color: "var(--text-secondary)" }}>
            No city on this list matches.
          </p>
        ) : null}

        <Link
          data-btn=""
          data-btn-dark=""
          href={country.browseHref}
          style={{
            marginTop: "14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            height: "50px",
            borderRadius: "14px",
            background: "var(--ink)",
            color: "#fff",
            fontSize: "15px",
            fontWeight: "700",
          }}
        >
          {country.browseLabel}
          <svg
            data-arrow=""
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--gold-ink)"
            strokeWidth="2.2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
