"use client";

import { useEffect } from "react";

/**
 * The October 2026 design's page behaviour, ported from its tbf-v2.js.
 *
 * - [data-reveal] and [data-stagger] fade up the first time they scroll into
 *   view. They are only hidden once this has run and set data-rv on <html>,
 *   so a reader without JavaScript gets the finished page.
 * - [data-countup] counts its number up once it is on screen. The server
 *   renders the final figure, so the number is right if this never runs.
 * - [data-toc] marks the link for the section being read and keeps it in view.
 * - [data-prog] is a reading-progress bar.
 * - [data-hero] tracks the pointer for its glow, and tilts its [data-tilt].
 * - [data-modal="id"] opens a <dialog>, [data-modal-close] closes it.
 */
export function V2Motion() {
  useEffect(() => {
    const w = window as unknown as { __tbfV2?: boolean };
    if (w.__tbfV2) return;
    w.__tbfV2 = true;

    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const hover = matchMedia("(hover: hover)").matches;
    document.documentElement.setAttribute("data-rv", "1");
    let ticking = false;

    const index = () => {
      document.querySelectorAll<HTMLElement>("[data-stagger]:not([data-ix])").forEach((list) => {
        list.setAttribute("data-ix", "");
        Array.from(list.children).forEach((child, i) => {
          const el = child as HTMLElement;
          if (!el.style.getPropertyValue("--i")) el.style.setProperty("--i", String(Math.min(i, 12)));
        });
      });
    };

    const scan = () => {
      const vh = window.innerHeight || 800;
      index();
      document
        .querySelectorAll<HTMLElement>("[data-reveal]:not([data-shown]), [data-stagger]:not([data-shown])")
        .forEach((node) => {
          const r = node.getBoundingClientRect();
          if (r.top < vh * 0.92 && r.bottom > 0) node.setAttribute("data-shown", "");
        });

      document.querySelectorAll<HTMLElement>("[data-countup]:not([data-counted])").forEach((node) => {
        const r = node.getBoundingClientRect();
        if (!(r.top < vh * 0.9 && r.bottom > 0)) return;
        node.setAttribute("data-counted", "");
        const m = (node.textContent || "").trim().match(/^([^\d]*)([\d,]+)(.*)$/);
        if (!m || reduce) return;
        const end = Number(m[2].replace(/,/g, ""));
        const [pre, , suf] = [m[1], m[2], m[3]];
        const comma = m[2].includes(",");
        const t0 = performance.now();
        const step = (t: number) => {
          const p = Math.min(1, (t - t0) / 1200);
          const v = Math.round(end * (1 - Math.pow(1 - p, 3)));
          node.textContent = pre + (comma ? v.toLocaleString("en-US") : String(v)) + suf;
          if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });

      const toc = document.querySelector<HTMLElement>("[data-toc]");
      if (toc) {
        const links = toc.querySelectorAll<HTMLAnchorElement>('a[href^="#"]');
        let current: HTMLAnchorElement | null = null;
        links.forEach((a) => {
          const el = document.getElementById(a.getAttribute("href")!.slice(1));
          if (el && el.getBoundingClientRect().top < 170) current = a;
        });
        if (!current && links[0]) current = links[0];
        links.forEach((a) => {
          const on = a === current ? "1" : "0";
          if (a.getAttribute("data-on") === on) return;
          a.setAttribute("data-on", on);
          if (on !== "1") return;
          const scroller = toc.querySelector<HTMLElement>("[data-toc-scroll]") || (toc.firstElementChild as HTMLElement | null);
          if (!scroller) return;
          const ar = a.getBoundingClientRect();
          const sr = scroller.getBoundingClientRect();
          if (ar.left < sr.left || ar.right > sr.right) scroller.scrollLeft += ar.left - sr.left - 40;
        });
      }

      const prog = document.querySelector<HTMLElement>("[data-prog]");
      if (prog) {
        const h = document.documentElement;
        const max = h.scrollHeight - h.clientHeight;
        prog.style.transform = `scaleX(${max > 0 ? Math.min(1, h.scrollTop / max) : 0})`;
      }
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        scan();
      });
    };

    const onMove = (e: PointerEvent) => {
      if (reduce || !hover) return;
      const hero = (e.target as Element | null)?.closest?.("[data-hero]") as HTMLElement | null;
      if (!hero) return;
      const r = hero.getBoundingClientRect();
      hero.style.setProperty("--mx", `${(((e.clientX - r.left) / r.width) * 100).toFixed(1)}%`);
      hero.style.setProperty("--my", `${(((e.clientY - r.top) / r.height) * 100).toFixed(1)}%`);
      const card = hero.querySelector<HTMLElement>("[data-tilt]");
      if (card) {
        const c = card.getBoundingClientRect();
        const dx = (e.clientX - (c.left + c.width / 2)) / r.width;
        const dy = (e.clientY - (c.top + c.height / 2)) / r.height;
        card.style.transform = `perspective(1200px) rotateY(${(dx * 8).toFixed(2)}deg) rotateX(${(-dy * 6).toFixed(2)}deg)`;
      }
    };

    const onOut = (e: PointerEvent) => {
      const hero = (e.target as Element | null)?.closest?.("[data-hero]") as HTMLElement | null;
      if (!hero || hero.contains(e.relatedTarget as Node | null)) return;
      const card = hero.querySelector<HTMLElement>("[data-tilt]");
      if (card) card.style.transform = "";
    };

    const onClick = (e: MouseEvent) => {
      const target = e.target as Element | null;
      const opener = target?.closest?.("[data-modal]");
      if (opener) {
        const dialog = document.getElementById(opener.getAttribute("data-modal") || "") as HTMLDialogElement | null;
        if (dialog?.showModal && !dialog.open) {
          e.preventDefault();
          dialog.showModal();
        }
        return;
      }
      const closer = target?.closest?.("[data-modal-close]");
      if (closer) {
        closer.closest("dialog")?.close();
        return;
      }
      if (target instanceof HTMLDialogElement && target.hasAttribute("data-v2-dialog")) target.close();
    };

    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    window.addEventListener("resize", onScroll);
    const mo = new MutationObserver(onScroll);
    mo.observe(document.body, { childList: true, subtree: true });
    document.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerout", onOut);
    document.addEventListener("click", onClick);
    requestAnimationFrame(scan);
    const failsafe = window.setTimeout(() => {
      document.querySelectorAll("[data-reveal], [data-stagger]").forEach((n) => n.setAttribute("data-shown", ""));
    }, 12000);

    return () => {
      window.removeEventListener("scroll", onScroll, { capture: true } as EventListenerOptions);
      window.removeEventListener("resize", onScroll);
      mo.disconnect();
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerout", onOut);
      document.removeEventListener("click", onClick);
      window.clearTimeout(failsafe);
      w.__tbfV2 = false;
    };
  }, []);

  return null;
}
