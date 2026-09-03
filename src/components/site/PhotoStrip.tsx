"use client";

import { useState } from "react";

// Photographs of the company's work, as published on its own website or its
// Google profile. They are shown as they were found, never cropped to hide what
// is in them and never captioned with a claim we cannot support.
//
// The images are hosted by the companies themselves, so some of them will
// eventually move or start refusing hotlinks. One that fails to load removes
// itself rather than leaving a broken tile on the page.

export type Photo = { id: string; url: string; alt: string | null };

export function PhotoStrip({ photos, name }: { photos: Photo[]; name: string }) {
  const [broken, setBroken] = useState<string[]>([]);
  const usable = photos.filter((photo) => !broken.includes(photo.id));
  if (usable.length === 0) return null;

  return (
    <ul className="photo-strip" data-count={Math.min(usable.length, 5)}>
      {usable.map((photo, index) => (
        <li key={photo.id} className="photo-strip__item">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photo.url}
            alt={photo.alt?.trim() || `Work by ${name}`}
            loading={index < 2 ? "eager" : "lazy"}
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setBroken((was) => (was.includes(photo.id) ? was : [...was, photo.id]))}
          />
        </li>
      ))}
    </ul>
  );
}
