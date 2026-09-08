import type { ReactNode } from "react";
import { GuidesTabs } from "@/components/admin/GuidesTabs";

export const metadata = { title: { default: "Guides", template: "%s · Guides" } };

export default function GuidesLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <GuidesTabs />
      {children}
    </>
  );
}
