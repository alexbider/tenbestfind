"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import type { AnalyticsEventType } from "@/lib/enums";

function send(type: AnalyticsEventType, businessId?: string, rankingId?: string) {
  const body = JSON.stringify({ type, path: window.location.pathname, businessId, rankingId });
  // sendBeacon survives the page unloading on an outbound click.
  if (navigator.sendBeacon) {
    navigator.sendBeacon("/api/track/", new Blob([body], { type: "application/json" }));
    return;
  }
  void fetch("/api/track/", { method: "POST", headers: { "content-type": "application/json" }, body, keepalive: true });
}

/** Records one view event when the page mounts. */
export function TrackView({
  type,
  businessId,
  rankingId,
}: {
  type: AnalyticsEventType;
  businessId?: string;
  rankingId?: string;
}) {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    send(type, businessId, rankingId);
  }, [type, businessId, rankingId]);
  return null;
}

/** Wraps an outbound link or call button and records the click. */
export function TrackClick({
  type,
  businessId,
  children,
}: {
  type: AnalyticsEventType;
  businessId?: string;
  children: ReactNode;
}) {
  return (
    <span
      onClick={() => send(type, businessId)}
      onKeyDown={(event) => {
        if (event.key === "Enter") send(type, businessId);
      }}
      style={{ display: "contents" }}
    >
      {children}
    </span>
  );
}

/**
 * One PAGE_VIEW per public page, including client-side navigations, so the
 * analytics can say which guides and hubs actually bring people in. Rankings
 * and profiles keep their own, more specific events on top of this one.
 */
export function TrackPageViews() {
  const pathname = usePathname();
  const last = useRef<string | null>(null);
  useEffect(() => {
    if (!pathname || last.current === pathname) return;
    last.current = pathname;
    send("PAGE_VIEW");
  }, [pathname]);
  return null;
}
