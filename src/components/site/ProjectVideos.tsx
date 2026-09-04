"use client";

import { useState } from "react";

export type ProfileVideo = {
  id: string;
  videoId: string;
  title: string;
  meta: string | null;
  duration: string | null;
};

/**
 * The project videos grid.
 *
 * Nothing is requested from YouTube until someone presses play: until then a
 * card is a local thumbnail and a button. That keeps YouTube's cookies and
 * its several hundred kilobytes off a page most readers only scroll past, so
 * the claim in the section's own subtitle stays true.
 */
export function ProjectVideos({ videos }: { videos: ProfileVideo[] }) {
  const [playing, setPlaying] = useState<string | null>(null);

  return (
    <div
      data-vgrid=""
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
        gap: "16px",
        alignItems: "stretch",
      }}
    >
      {videos.map((video) => (
        <article
          key={video.id}
          data-vcard=""
          style={{
            border: "1px solid var(--border-subtle)",
            borderRadius: "18px",
            overflow: "hidden",
            background: "var(--surface-card)",
            boxShadow: "var(--shadow-xs)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ position: "relative", aspectRatio: "16 / 9", background: "#0B1730", overflow: "hidden" }}>
            {playing === video.id ? (
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${video.videoId}?autoplay=1&rel=0`}
                title={video.title}
                loading="lazy"
                style={{ left: 0, width: "100%" }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
              />
            ) : (
              <button
                type="button"
                onClick={() => setPlaying(video.id)}
                aria-label={`Play: ${video.title}`}
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: 0,
                  padding: 0,
                  background: "transparent",
                  cursor: "pointer",
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "radial-gradient(60% 70% at 50% 55%, rgba(45,116,215,0.35), transparent 75%)",
                  }}
                />
                <span
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    inset: 0,
                    backgroundImage:
                      "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
                    backgroundSize: "28px 28px",
                  }}
                />
                <span
                  data-vplay=""
                  style={{
                    position: "relative",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "68px",
                    height: "48px",
                    borderRadius: "14px",
                    background: "#FF0033",
                    color: "#fff",
                    boxShadow: "0 16px 40px -12px rgba(0,0,0,0.6)",
                  }}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M8 5.5v13l10-6.5z" />
                  </svg>
                </span>
                {video.duration ? (
                  <span
                    style={{
                      position: "absolute",
                      bottom: "12px",
                      right: "12px",
                      padding: "4px 8px",
                      borderRadius: "6px",
                      background: "rgba(0,0,0,0.7)",
                      fontSize: "12px",
                      fontWeight: "600",
                      color: "#fff",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {video.duration}
                  </span>
                ) : null}
              </button>
            )}
          </div>
          <div style={{ padding: "16px 18px" }}>
            <h3 style={{ fontSize: "15.5px", fontWeight: "600", color: "var(--blue-900)", marginBottom: "3px" }}>
              {video.title}
            </h3>
            {video.meta ? (
              <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>{video.meta}</p>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  );
}
