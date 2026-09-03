import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PortalShell } from "@/components/portal/shell";
import { ownedBusinesses, requireOwner } from "@/lib/auth";

// The portal reads live lead and analytics data on every request.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "Your business", template: "%s · TenBestFind" },
  robots: { index: false, follow: false },
};

export default async function PortalLayout({ children }: { children: ReactNode }) {
  const user = await requireOwner();
  const businesses = await ownedBusinesses(user);

  return (
    <PortalShell user={user} business={businesses[0] ?? null} businesses={businesses}>
      {children}
    </PortalShell>
  );
}
