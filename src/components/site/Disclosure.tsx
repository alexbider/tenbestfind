"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { InfoIcon } from "@/components/ui/Icon";

/**
 * Universal disclosure modal. Every caveat on the site lives behind one of
 * these rather than sitting inline. Built on native <dialog>, so Escape closes
 * it and focus is trapped by the browser; it becomes a bottom sheet on phones.
 */
export function Disclosure({
  label,
  title,
  children,
  align = "start",
}: {
  label: string;
  title: string;
  children: ReactNode;
  align?: "start" | "end";
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const returnFocus = () => triggerRef.current?.focus();
    dialog.addEventListener("close", returnFocus);
    return () => dialog.removeEventListener("close", returnFocus);
  }, []);

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        className="disclosure__trigger"
        style={{ alignSelf: align === "end" ? "flex-end" : "flex-start" }}
        onClick={() => ref.current?.showModal()}
      >
        <InfoIcon />
        {label}
      </button>
      <dialog className="modal" ref={ref} aria-labelledby={`${title}-heading`}>
        <div className="modal__head">
          <p className="modal__title" id={`${title}-heading`}>
            <InfoIcon size={18} />
            {title}
          </p>
          <button
            type="button"
            className="modal__close"
            aria-label="Close"
            onClick={() => ref.current?.close()}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>
        <div className="modal__body">{children}</div>
      </dialog>
    </>
  );
}
