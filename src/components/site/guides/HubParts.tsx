import type { ReactNode } from "react";
import Link from "next/link";
import { Crumbs } from "@/components/site/page-parts";
import { Media } from "@/components/ui/primitives";
import type { IconName } from "@/lib/icon-paths";
import { ArrowLink, HeroBackdrop, HeroTitle, Tile, tail } from "./parts";

/**
 * The pieces the guide hubs share, in the visual language of the two guide
 * designs and the services index: the gridded hero with a serif accent in the
 * title, accent section headings, and `data-card` tiles. The hub pages keep
 * their own data and copy; this only draws it.
 */

const SHELL = { maxWidth: "1240px", margin: "0 auto", padding: "0 24px" } as const;

const H2 = {
  fontSize: "clamp(28px, 3.2vw, 40px)",
  lineHeight: "1.1",
  fontWeight: "800",
  letterSpacing: "-0.035em",
  textWrap: "balance",
} as const;

export function HubHero({
  crumbs,
  eyebrow,
  title,
  titleId,
  lead,
  chips,
  aside,
}: {
  crumbs: { label: string; href?: string }[];
  eyebrow?: string;
  title: string;
  titleId: string;
  lead: string;
  chips?: ReactNode;
  aside?: ReactNode;
}) {
  const text = (
    <div style={{ minWidth: 0 }}>
      {eyebrow ? (
        <p data-eyebrow="" data-in="1" style={{ marginBottom: "16px" }}>
          <span data-eyebrow-rule="" aria-hidden="true" />
          {eyebrow}
        </p>
      ) : null}
      <h1
        id={titleId}
        data-in="2"
        style={{ fontSize: "clamp(36px, 5vw, 60px)", lineHeight: "1.06", letterSpacing: "-0.04em", fontWeight: "800", textWrap: "balance" }}
      >
        <HeroTitle text={title} />
      </h1>
      <p
        data-in="3"
        style={{
          marginTop: "20px",
          fontSize: "19px",
          lineHeight: "1.65",
          color: "var(--text-secondary)",
          maxWidth: "680px",
          textWrap: "pretty",
        }}
      >
        {lead}
      </p>
      {chips ? <div style={{ marginTop: "28px" }}>{chips}</div> : null}
    </div>
  );

  return (
    <section
      aria-labelledby={titleId}
      data-hero=""
      style={{
        position: "relative",
        overflow: "hidden",
        borderBottom: "1px solid var(--border-subtle)",
        background: "linear-gradient(180deg, var(--blue-50) 0%, rgba(234,244,255,0.3) 70%, var(--surface-card) 100%)",
      }}
    >
      <HeroBackdrop />
      <div style={{ ...SHELL, position: "relative", padding: "20px 24px 56px" }}>
        <div style={{ marginBottom: "30px" }}>
          <Crumbs items={crumbs} flush />
        </div>
        {aside ? (
          <div
            data-split=""
            style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.15fr) minmax(0, 0.85fr)", gap: "56px", alignItems: "center" }}
          >
            {text}
            {aside}
          </div>
        ) : (
          <div style={{ maxWidth: "860px" }}>{text}</div>
        )}
      </div>
    </section>
  );
}

/** A row of pill links with a small label in front, the hub's way to jump sideways. */
export function HubChips({ label, items }: { label: string; items: { href: string; label: string }[] }) {
  return (
    <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
      <span style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-secondary)", marginRight: "4px" }}>{label}</span>
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          data-chip=""
          style={{
            display: "inline-flex",
            alignItems: "center",
            minHeight: "38px",
            padding: "0 16px",
            borderRadius: "999px",
            border: "1px solid var(--border-subtle)",
            background: "var(--surface-card)",
            color: "var(--blue-900)",
            fontSize: "14.5px",
            fontWeight: "600",
            boxShadow: "var(--shadow-xs)",
          }}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}

export function HubSection({
  tone = "card",
  labelledBy,
  eyebrow,
  title,
  lead,
  linkHref,
  linkLabel,
  last,
  children,
}: {
  tone?: "card" | "page";
  labelledBy: string;
  eyebrow?: string;
  title: string;
  lead?: string;
  linkHref?: string;
  linkLabel?: string;
  last?: boolean;
  children?: ReactNode;
}) {
  return (
    <section
      aria-labelledby={labelledBy}
      style={{
        background: tone === "page" ? "var(--surface-page)" : "var(--surface-card)",
        borderBottom: last ? undefined : "1px solid var(--border-subtle)",
      }}
    >
      <div style={{ ...SHELL, padding: "72px 24px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "16px 32px",
            marginBottom: children ? "36px" : 0,
          }}
        >
          <div style={{ maxWidth: "720px" }}>
            {eyebrow ? (
              <p data-eyebrow="" style={{ marginBottom: "14px" }}>
                <span data-eyebrow-rule="" aria-hidden="true" />
                {eyebrow}
              </p>
            ) : null}
            <h2 id={labelledBy} data-reveal="" style={H2}>
              {tail(title)}
            </h2>
            {lead ? (
              <p style={{ marginTop: "14px", fontSize: "17px", lineHeight: "1.7", color: "var(--text-secondary)", textWrap: "pretty" }}>
                {lead}
              </p>
            ) : null}
          </div>
          {linkHref && linkLabel ? (
            <ArrowLink href={linkHref} weight={600}>
              {linkLabel}
            </ArrowLink>
          ) : null}
        </div>
        {children}
      </div>
    </section>
  );
}

export type HubCard = {
  key: string;
  href: string;
  title: string;
  excerpt: string | null;
  eyebrow: string;
  range: string | null;
  meta: string;
  image: string | null;
  cost: boolean;
};

/** One guide, as a card. The lead variant spreads wider when it has a picture. */
export function HubGuideCard({ card, lead }: { card: HubCard; lead?: boolean }) {
  const icon: IconName = card.cost ? "dollar" : "book";
  const body = (
    <div
      style={{
        padding: lead ? "30px 32px 32px" : "24px 24px 24px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        flex: 1,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px", flexWrap: "wrap" }}>
        <Tile icon={icon} size={lead ? 44 : 40} />
        <p
          style={{
            fontSize: "11.5px",
            fontWeight: "700",
            letterSpacing: "var(--ls-wider)",
            textTransform: "uppercase",
            color: "var(--text-secondary)",
          }}
        >
          {card.eyebrow}
        </p>
        {lead ? (
          <span
            style={{
              marginLeft: "auto",
              fontSize: "12px",
              fontWeight: "700",
              letterSpacing: "var(--ls-wide)",
              textTransform: "uppercase",
              color: "var(--color-primary)",
              background: "var(--blue-50)",
              border: "1px solid var(--blue-100)",
              borderRadius: "999px",
              padding: "5px 11px",
            }}
          >
            Start here
          </span>
        ) : null}
      </div>
      <h3 style={{ fontSize: lead ? "clamp(22px, 2.4vw, 28px)" : "19px", lineHeight: "1.25", fontWeight: "700", marginBottom: "10px" }}>
        <Link href={card.href} style={{ color: "var(--blue-900)" }}>
          {card.title}
        </Link>
      </h3>
      {card.excerpt ? (
        <p
          style={{
            fontSize: lead ? "16px" : "15px",
            lineHeight: "1.62",
            color: "var(--text-secondary)",
            marginBottom: "14px",
            maxWidth: "60ch",
          }}
        >
          {card.excerpt}
        </p>
      ) : null}
      {card.range ? (
        <p
          style={{
            fontSize: lead ? "24px" : "20px",
            fontWeight: "700",
            letterSpacing: "var(--ls-tighter)",
            color: "var(--blue-900)",
            fontVariantNumeric: "tabular-nums",
            marginBottom: "14px",
          }}
        >
          {card.range}
        </p>
      ) : null}
      <p style={{ marginTop: "auto", fontSize: "13px", color: "var(--text-muted)" }}>{card.meta}</p>
    </div>
  );

  return (
    <article
      data-card=""
      {...(lead ? { "data-guide-lead": "" } : {})}
      style={{
        background: "var(--surface-card)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "22px",
        boxShadow: "var(--shadow-sm)",
        overflow: "hidden",
        display: lead && card.image ? "grid" : "flex",
        flexDirection: "column",
        gridTemplateColumns: lead && card.image ? "repeat(auto-fit, minmax(min(100%, 300px), 1fr))" : undefined,
        height: "100%",
      }}
    >
      {card.image ? (
        <div className="thumb" style={lead ? { minHeight: "clamp(200px, 24vw, 300px)" } : { height: "160px" }}>
          <Media
            src={card.image}
            alt=""
            sizes={lead ? "(max-width: 900px) 100vw, 560px" : "(max-width: 760px) 100vw, (max-width: 1200px) 50vw, 380px"}
          />
        </div>
      ) : null}
      {body}
    </article>
  );
}

export function HubCardGrid({ cards, two }: { cards: HubCard[]; two?: boolean }) {
  return (
    <ul
      data-stagger=""
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(auto-fill, minmax(${two ? 440 : 320}px, 1fr))`,
        gap: "20px",
      }}
    >
      {cards.map((card) => (
        <li key={card.key} style={{ display: "flex", flexDirection: "column" }}>
          <HubGuideCard card={card} />
        </li>
      ))}
    </ul>
  );
}

/** The sideways navigation: one row per hub, with the design's tile and chevron. */
export function HubLinkGrid({ items, icon }: { items: { href: string; label: string }[]; icon: IconName }) {
  return (
    <ul data-stagger="" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "14px" }}>
      {items.map((item) => (
        <li key={item.href}>
          <Link
            href={item.href}
            data-card=""
            style={{
              display: "flex",
              alignItems: "center",
              gap: "14px",
              padding: "18px 20px",
              background: "var(--surface-card)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "16px",
              boxShadow: "var(--shadow-xs)",
              color: "var(--blue-900)",
              fontSize: "16px",
              fontWeight: "700",
              textDecoration: "none",
            }}
          >
            <Tile icon={icon} size={40} />
            <span style={{ flex: 1, minWidth: 0 }}>{item.label}</span>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--color-primary)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              style={{ flexShrink: 0 }}
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
          </Link>
        </li>
      ))}
    </ul>
  );
}
