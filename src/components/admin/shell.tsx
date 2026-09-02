import Link from "next/link";
import type { ReactNode } from "react";
import { LogoMark } from "@/components/site/Logo";
import { Icon, type IconName } from "@/components/ui/Icon";
import { compactNumber, percentChange } from "@/lib/format";
import type { SessionUser } from "@/lib/auth";
import { AdminNavLink, SignOutButton } from "./nav-client";

export const ADMIN_NAV: { label: string; items: { name: string; href: string; icon: IconName }[] }[] = [
  {
    label: "Overview",
    items: [
      { name: "Dashboard", href: "/admin", icon: "grid" },
      { name: "Analytics", href: "/admin/analytics", icon: "chart" },
      { name: "Event stream", href: "/admin/events", icon: "pulse" },
    ],
  },
  {
    label: "Content",
    items: [
      { name: "Pages", href: "/admin/pages", icon: "file" },
      { name: "Posts & guides", href: "/admin/guides", icon: "book" },
      { name: "Top 10 rankings", href: "/admin/rankings", icon: "trophy" },
      { name: "Editorial team", href: "/admin/people", icon: "users" },
      { name: "Questions & criteria", href: "/admin/faqs", icon: "help" },
      { name: "Services & locations", href: "/admin/taxonomy", icon: "sitemap" },
    ],
  },
  {
    label: "Directory",
    items: [
      { name: "Businesses", href: "/admin/businesses", icon: "store" },
      { name: "Imports", href: "/admin/imports", icon: "refresh" },
      { name: "Claims & verification", href: "/admin/claims", icon: "key" },
      { name: "Reports & corrections", href: "/admin/submissions", icon: "flag" },
    ],
  },
  {
    label: "Monetization",
    items: [
      { name: "Packages", href: "/admin/packages", icon: "box" },
      { name: "Subscriptions", href: "/admin/subscriptions", icon: "card" },
      { name: "Sponsored inventory", href: "/admin/sponsored", icon: "megaphone" },
    ],
  },
  {
    label: "System",
    items: [
      { name: "Global SEO", href: "/admin/seo", icon: "search" },
      { name: "Users & roles", href: "/admin/users", icon: "users" },
      { name: "Integrations & MCP", href: "/admin/integrations", icon: "plug" },
      { name: "Connected apps", href: "/admin/connections", icon: "key" },
      { name: "Settings", href: "/admin/settings", icon: "gear" },
      { name: "Audit log", href: "/admin/audit", icon: "history" },
    ],
  },
];

export function AdminShell({ user, children }: { user: SessionUser; children: ReactNode }) {
  return (
    <div className="admin">
      <aside className="admin__side">
        <Link href="/admin" className="admin__brand">
          <LogoMark size={24} />
          <span>TenBestFind</span>
        </Link>
        <nav aria-label="Admin">
          {ADMIN_NAV.map((group) => (
            <div key={group.label} className="admin__group">
              <p>{group.label}</p>
              <ul>
                {group.items.map((item) => (
                  <li key={item.href}>
                    <AdminNavLink href={item.href} icon={item.icon} label={item.name} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        <div className="admin__user">
          <span className="admin__avatar" aria-hidden="true">
            {user.name
              .split(" ")
              .slice(0, 2)
              .map((part) => part.charAt(0))
              .join("")}
          </span>
          <span style={{ minWidth: 0 }}>
            <strong>{user.name}</strong>
            <span>{user.role === "ADMIN" ? "Administrator" : "Editor"}</span>
          </span>
        </div>
        <div className="admin__side-foot">
          <Link href="/" target="_blank">
            <Icon name="globe" size={15} />
            View site
          </Link>
          <SignOutButton />
        </div>
      </aside>
      <div className="admin__main">{children}</div>
    </div>
  );
}

export function AdminHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="admin__header">
      <div>
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
      {actions ? <div className="admin__header-actions">{actions}</div> : null}
    </header>
  );
}

export function StatRow({
  stats,
}: {
  stats: { label: string; value: string | number; delta?: number; hint?: string }[];
}) {
  return (
    <ul className="stat-row">
      {stats.map((stat) => (
        <li key={stat.label}>
          <p className="stat-row__label">{stat.label}</p>
          <p className="stat-row__value">
            {typeof stat.value === "number" ? compactNumber(stat.value) : stat.value}
          </p>
          {stat.delta !== undefined ? (
            <p className="stat-row__delta" data-dir={stat.delta >= 0 ? "up" : "down"}>
              <Icon name={stat.delta >= 0 ? "up" : "down"} size={13} strokeWidth={2.2} />
              {Math.abs(stat.delta)}% vs previous period
            </p>
          ) : null}
          {stat.hint ? <p className="stat-row__hint">{stat.hint}</p> : null}
        </li>
      ))}
    </ul>
  );
}

export { percentChange };

export function Panel({
  title,
  description,
  actions,
  children,
  padded = true,
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  padded?: boolean;
}) {
  return (
    <section className="panel">
      {title ? (
        <div className="panel__head">
          <div>
            <h2>{title}</h2>
            {description ? <p>{description}</p> : null}
          </div>
          {actions ? <div className="panel__actions">{actions}</div> : null}
        </div>
      ) : null}
      <div className={padded ? "panel__body" : undefined}>{children}</div>
    </section>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="empty-state">
      <Icon name="info" size={22} color="var(--gray-400)" />
      <p>
        <strong>{title}</strong>
        <span>{body}</span>
      </p>
    </div>
  );
}

/** A horizontal bar chart. Deliberately plain: it is read, not admired. */
export function BarChart({
  data,
  valueLabel,
}: {
  data: { label: string; value: number; meta?: string }[];
  valueLabel?: string;
}) {
  const max = Math.max(1, ...data.map((row) => row.value));
  return (
    <ul className="bar-chart">
      {data.map((row) => (
        <li key={row.label}>
          <span className="bar-chart__label">{row.label}</span>
          <span className="bar-chart__track">
            <span className="bar-chart__fill" style={{ width: `${(row.value / max) * 100}%` }} />
          </span>
          <span className="bar-chart__value">
            {compactNumber(row.value)}
            {valueLabel ? ` ${valueLabel}` : ""}
            {row.meta ? ` · ${row.meta}` : ""}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Sparkline-style column chart for a daily series. */
export function TrendChart({ series }: { series: { date: string; value: number }[] }) {
  const max = Math.max(1, ...series.map((point) => point.value));
  return (
    <div className="trend-chart" role="img" aria-label={`Daily trend, ${series.length} days`}>
      {series.map((point) => (
        <span key={point.date} title={`${point.date}: ${point.value}`}>
          <span style={{ height: `${Math.max(2, (point.value / max) * 100)}%` }} />
        </span>
      ))}
    </div>
  );
}
