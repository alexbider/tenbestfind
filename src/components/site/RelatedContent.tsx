import Link from "next/link";
import { SHELL } from "@/components/site/page-parts";
import type { RelatedGroup } from "@/lib/related";

// Where to go next, on the page types that used to just end.
//
// Server-rendered like everything else here, because a crawler that does not
// run JavaScript sees exactly what it is handed, and a link graph that only
// exists after hydration is a link graph most engines never see.
//
// Nothing renders when there is nothing to link to. An empty box under a
// heading that says Related reads as something that failed to load.

export function RelatedContent({
  groups,
  title = "Keep looking",
  id = "related",
}: {
  groups: RelatedGroup[];
  title?: string;
  id?: string;
}) {
  if (groups.length === 0) return null;

  return (
    <section id={id} aria-labelledby={`${id}-h2`} style={{ borderTop: "1px solid var(--border-subtle)" }}>
      <div style={{ ...SHELL, padding: "56px 24px" }}>
        <h2
          id={`${id}-h2`}
          style={{ fontSize: "clamp(22px, 2.4vw, 28px)", fontWeight: 700, marginBottom: 28, textWrap: "balance" }}
        >
          {title}
        </h2>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 32 }}>
          {groups.map((group) => (
            <div key={group.title}>
              <h3
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: "var(--ls-wide)",
                  textTransform: "uppercase",
                  color: "var(--text-secondary)",
                  marginBottom: 12,
                }}
              >
                {group.title}
              </h3>
              <ul style={{ display: "grid", gap: 8, listStyle: "none", padding: 0, margin: 0 }}>
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      style={{ fontSize: 15, fontWeight: 600, color: "var(--text-link)", lineHeight: 1.5 }}
                    >
                      {link.label}
                    </Link>
                    {link.meta ? (
                      <span style={{ display: "block", fontSize: 13, color: "var(--text-muted)" }}>{link.meta}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
