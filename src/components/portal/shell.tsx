import Link from "next/link";
import type { ReactNode } from "react";
import { AdminNavLink, SignOutButton } from "@/components/admin/nav-client";
import { LogoMark } from "@/components/site/Logo";
import { Icon } from "@/components/ui/Icon";
import type { SessionUser } from "@/lib/auth";

// The company owner's side of the house. It reuses the admin's chrome and its
// stylesheet on purpose: the same components, a much shorter menu, and nothing
// on it that touches editorial work or another company's data.

const PORTAL_NAV = [
  { name: "Overview", href: "/portal", icon: "grid" as const },
  { name: "Leads", href: "/portal/leads", icon: "mail" as const },
  { name: "Performance", href: "/portal/analytics", icon: "chart" as const },
];

export function PortalShell({
  user,
  business,
  businesses,
  children,
}: {
  user: SessionUser;
  business?: { id: string; name: string } | null;
  businesses: { id: string; name: string }[];
  children: ReactNode;
}) {
  return (
    <div className="admin">
      <aside className="admin__side">
        <Link href="/portal" className="admin__brand">
          <LogoMark size={24} />
          <span>TenBestFind</span>
        </Link>

        <nav aria-label="Your business">
          <div className="admin__group">
            <p>{business?.name ?? "Your business"}</p>
            <ul>
              {PORTAL_NAV.map((item) => (
                <li key={item.href}>
                  <AdminNavLink href={item.href} icon={item.icon} label={item.name} />
                </li>
              ))}
            </ul>
          </div>

          {businesses.length > 1 ? (
            <div className="admin__group">
              <p>Switch company</p>
              <ul>
                {businesses.map((row) => (
                  <li key={row.id}>
                    <AdminNavLink href={`/portal?businessId=${row.id}`} icon="store" label={row.name} />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
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
            <span>
              {user.role === "BUSINESS_OWNER" ? "Business owner" : "Staff, viewing as an owner"}
            </span>
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
