"use client";

import { useEffect, useRef, type ReactNode } from "react";
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
