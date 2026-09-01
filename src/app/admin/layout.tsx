import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AdminShell } from "@/components/admin/shell";
import { getSession } from "@/lib/auth";

// The admin reads and writes live data on every request.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · TenBestFind admin" },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getSession();

  // The login route renders inside this layout too, so it cannot require a
  // session here. Every other admin page calls requireStaff itself.
  if (!session) return <>{children}</>;

  return <AdminShell user={session}>{children}</AdminShell>;
}
