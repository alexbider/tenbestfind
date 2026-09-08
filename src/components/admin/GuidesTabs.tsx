"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// The four faces of one job. A guide starts as a topic the radar found, becomes
// a commission somebody writes, ends up as a page, and is written to a brief an
// editor maintains. Those used to be four entries in the sidebar, which made
// them look like four unrelated things.

const TABS = [
  { href: "/admin/guides", label: "Library", exact: true },
  { href: "/admin/guides/pipeline", label: "Pipeline" },
  { href: "/admin/guides/topics", label: "Topics" },
  { href: "/admin/guides/briefs", label: "Briefs" },
];

export function GuidesTabs() {
  const pathname = usePathname() ?? "";

  return (
    <div className="admin-tabs">
      {TABS.map((tab) => {
        // The library is every path that is not one of the others, so that a
        // guide being edited still reads as being in the library.
        const on = tab.exact
          ? !TABS.some((other) => !other.exact && pathname.startsWith(other.href))
          : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Link key={tab.href} href={tab.href} data-on={on}>
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
