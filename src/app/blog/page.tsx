import type { Metadata } from "next";
import Link from "next/link";
import { CrumbBar, FinalSearch } from "@/components/site/blocks";
import { SiteChrome } from "@/components/site/SiteChrome";
import { JsonLd, Media, Section, SectionHead } from "@/components/ui/primitives";
import { monthYear } from "@/lib/format";
import { db } from "@/lib/db";
import { absoluteUrl, routes } from "@/lib/urls";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Blog — notes from the editorial team",
  description:
    "What we are seeing across the trades: pricing shifts, licence changes and what they mean for a homeowner about to hire.",
  alternates: { canonical: "/blog/" },
};

export default async function BlogIndexPage() {
  const posts = await db.post.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { publishedAt: "desc" },
    include: {
      category: { select: { name: true, serviceName: true } },
      author: { select: { name: true } },
    },
  });

  return (
    <SiteChrome>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Blog",
          url: absoluteUrl(routes.blogIndex()),
        }}
      />
      <CrumbBar items={[{ label: "Home", href: "/" }, { label: "Blog" }]} />

      <section aria-labelledby="hero-h1" className="index-hero">
        <div className="shell" style={{ padding: "52px var(--gutter) 44px" }}>
          <h1 id="hero-h1" className="hero__title" style={{ fontSize: "clamp(32px, 3.8vw, 46px)" }}>
            Notes from the editorial team
          </h1>
          <p className="hero__lead" style={{ maxWidth: 640 }}>
            What we are seeing across the trades, and what it means for someone about to hire. Every
            post carries a name and a date.
          </p>
        </div>
      </section>

      <Section labelledBy="posts-h2" ruleBottom={false}>
        <SectionHead id="posts-h2" title="Latest" />
        {posts.length === 0 ? (
          <p style={{ fontSize: 15.5, lineHeight: 1.7, color: "var(--text-secondary)" }}>
            Nothing published yet. The{" "}
            <Link href={routes.guidesIndex()}>guides</Link> are where the practical advice lives in
            the meantime.
          </p>
        ) : (
          <div className="card-grid">
            {posts.map((post) => (
              <article key={post.id} className="card card--lift" style={{ overflow: "hidden" }}>
                <div className="thumb" style={{ height: 150 }}>
                  <Media src={post.heroImage} alt="" />
                </div>
                <div style={{ padding: "20px 22px 22px" }}>
                  <p className="eyebrow" style={{ marginBottom: 8 }}>
                    {post.category?.serviceName ?? "General"}
                  </p>
                  <h3 style={{ fontSize: 18, lineHeight: 1.3, marginBottom: 8 }}>
                    <Link href={routes.post(post.slug)} style={{ color: "var(--ink)" }}>
                      {post.title}
                    </Link>
                  </h3>
                  <p
                    style={{
                      fontSize: 14.5,
                      lineHeight: 1.55,
                      color: "var(--text-secondary)",
                      marginBottom: 10,
                    }}
                  >
                    {post.excerpt}
                  </p>
                  <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
                    {post.author ? `By ${post.author.name} · ` : ""}
                    {monthYear(post.publishedAt)}
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}
      </Section>

      <FinalSearch title="Ready to find someone?" />
    </SiteChrome>
  );
}
