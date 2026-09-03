import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { ArrowRight, Check, ChevronRight, Icon, type IconName } from "./Icon";
import { STATUS_TONES } from "@/lib/enums";
import { humanizeStatus } from "@/lib/format";
import type { Crumb } from "@/lib/urls";

/* ----------------------------------------------------------------- layout */

export function Shell({
  children,
  style,
  className,
}: {
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
}) {
  return (
    <div className={className ? `shell ${className}` : "shell"} style={style}>
      {children}
    </div>
  );
}

export function Section({
  children,
  tone = "card",
  ruleTop,
  ruleBottom = true,
  labelledBy,
  id,
  style,
  tight,
}: {
  children: ReactNode;
  tone?: "card" | "page" | "soft" | "ink";
  ruleTop?: boolean;
  ruleBottom?: boolean;
  labelledBy?: string;
  id?: string;
  style?: CSSProperties;
  tight?: boolean;
}) {
  const toneClass =
    tone === "page"
      ? "section--page"
      : tone === "soft"
        ? "section--soft"
        : tone === "ink"
          ? "section--ink"
          : "";
  const classes = [toneClass, ruleTop ? "rule-top" : "", ruleBottom ? "rule-bottom" : ""]
    .filter(Boolean)
    .join(" ");
  return (
    <section id={id} aria-labelledby={labelledBy} className={classes} style={style}>
      <div className={tight ? "shell section section--tight" : "shell section"}>{children}</div>
    </section>
  );
}

export function SectionHead({
  id,
  title,
  lead,
  linkHref,
  linkLabel,
  eyebrow,
}: {
  id?: string;
  title: string;
  lead?: string;
  linkHref?: string;
  linkLabel?: string;
  eyebrow?: string;
}) {
  return (
    <div className="section-head">
      <div className="section-head__text">
        {eyebrow ? <p className="eyebrow" style={{ marginBottom: 10 }}>{eyebrow}</p> : null}
        <h2 id={id}>{title}</h2>
        {lead ? <p>{lead}</p> : null}
      </div>
      {linkHref && linkLabel ? <ArrowLink href={linkHref}>{linkLabel}</ArrowLink> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ links */

export function ArrowLink({
  href,
  children,
  style,
}: {
  href: string;
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <Link className="arrow-link" href={href} style={style}>
      {children}
      <ArrowRight />
    </Link>
  );
}

export function RowLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className="row-link">
      <span>{children}</span>
      <ChevronRight />
    </Link>
  );
}

/* ---------------------------------------------------------------- buttons */

type ButtonVariant = "primary" | "secondary" | "ghost";

export function LinkButton({
  href,
  children,
  variant = "primary",
  size,
  block,
  style,
  icon,
}: {
  href: string;
  children: ReactNode;
  variant?: ButtonVariant;
  size?: "sm";
  block?: boolean;
  style?: CSSProperties;
  icon?: ReactNode;
}) {
  const classes = ["btn", `btn--${variant}`, size === "sm" ? "btn--sm" : "", block ? "btn--block" : ""]
    .filter(Boolean)
    .join(" ");
  return (
    <Link href={href} className={classes} style={style}>
      {children}
      {icon}
    </Link>
  );
}

/* ------------------------------------------------------------------ marks */

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "positive" | "warning" | "danger" | "brand" | "gold";
}) {
  const tones: Record<string, CSSProperties> = {
    neutral: { background: "var(--surface-sunken)", color: "var(--text-secondary)" },
    positive: { background: "var(--green-50)", color: "var(--green-600)" },
    warning: { background: "var(--amber-50)", color: "var(--amber-600)" },
    danger: { background: "#FDECEB", color: "var(--maple-600)" },
    brand: { background: "var(--blue-50)", color: "var(--blue-700)" },
    gold: { background: "var(--gold-soft)", color: "var(--gold)" },
  };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 10px",
        borderRadius: 8,
        fontSize: 12,
        fontWeight: 600,
        lineHeight: 1.4,
        ...tones[tone],
      }}
    >
      {children}
    </span>
  );
}

export function StatusPill({ status }: { status: string }) {
  const tone = STATUS_TONES[status] ?? "neutral";
  return <Badge tone={tone}>{humanizeStatus(status)}</Badge>;
}

export function VerifiedMark({ label = "Verified" }: { label?: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 13,
        fontWeight: 600,
        color: "var(--green-600)",
      }}
    >
      <Check size={15} />
      {label}
    </span>
  );
}

export function TrustItem({ icon, label }: { icon: IconName; label: string }) {
  return (
    <li className="trust-strip__item">
      <Icon name={icon} size={20} color="var(--gray-400)" />
      <span>{label}</span>
    </li>
  );
}

/* ------------------------------------------------------------- navigation */

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="crumbs">
      <ol
        itemScope
        itemType="https://schema.org/BreadcrumbList"
        style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}
      >
        {items.map((item, index) => (
          <li
            key={`${item.label}-${index}`}
            itemProp="itemListElement"
            itemScope
            itemType="https://schema.org/ListItem"
            style={{ display: "flex", alignItems: "center", gap: 8 }}
          >
            {item.href ? (
              <Link href={item.href} itemProp="item" style={{ color: "var(--text-secondary)" }}>
                <span itemProp="name">{item.label}</span>
              </Link>
            ) : (
              <span itemProp="name" aria-current="page" style={{ color: "var(--text-primary)", fontWeight: 600 }}>
                {item.label}
              </span>
            )}
            <meta itemProp="position" content={String(index + 1)} />
            {index < items.length - 1 ? <ChevronRight size={13} color="var(--gray-300)" /> : null}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/* -------------------------------------------------------------- media slot */

/**
 * Renders the image when the record has one and a neutral placeholder when it
 * does not, so an unset photo never shows clipped placeholder text.
 */
export function Media({
  src,
  alt,
  height,
  monogram,
  radius = 0,
  tone,
}: {
  src?: string | null;
  alt: string;
  height?: number | string;
  monogram?: string;
  radius?: number;
  /**
   * "dark" for a slot on a dark card. The placeholder then keeps whatever the
   * wrapper is painted rather than covering it with the light sunken surface,
   * which on navy reads as a white panel rather than an empty photo.
   */
  tone?: "dark";
}) {
  if (src) {
    // Photos come from arbitrary hosts, so this stays a plain img rather than
    // next/image with a remote loader.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} style={{ width: "100%", height: "100%", objectFit: "cover" }} />;
  }
  return (
    <span
      aria-hidden="true"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: height ?? "100%",
        borderRadius: radius,
        background: tone === "dark" ? "transparent" : "var(--surface-sunken)",
        color: tone === "dark" ? "rgba(232,237,245,0.38)" : "var(--gray-400)",
        fontSize: monogram ? 20 : 13,
        fontWeight: 700,
        letterSpacing: monogram ? "0.02em" : undefined,
      }}
    >
      {monogram ?? ""}
    </span>
  );
}

export function Monogram({
  name,
  size = 64,
  radius = 14,
}: {
  name: string;
  size?: number;
  radius?: number;
}) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
  return (
    <span
      aria-hidden="true"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: radius,
        border: "1px solid var(--border-subtle)",
        background: "var(--surface-card)",
        color: "var(--ink)",
        fontSize: Math.round(size / 3),
        fontWeight: 700,
        letterSpacing: "0.01em",
      }}
    >
      {initials}
    </span>
  );
}

/* --------------------------------------------------------------- structure */

export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return (
    <script
      type="application/ld+json"
      // Serialized server-side from our own data, never from user input.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
