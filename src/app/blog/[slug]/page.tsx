import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { GuideBlock } from "../../../../prisma/data/editorial";
import { CrumbBar, FinalSearch, GuideBody, LinkGrid } from "@/components/site/blocks";
import { SiteChrome } from "@/components/site/SiteChrome";
import { EditorialDisclosure } from "@/components/site/disclosures";
import { Icon } from "@/components/ui/Icon";
import { JsonLd, Media, Section, SectionHead } from "@/components/ui/primitives";
import { monthYear } from "@/lib/format";
import { parseJson } from "@/lib/json";
import { db } from "@/lib/db";
import { redirectIfKnown } from "@/lib/redirects";
import { seoFor } from "@/lib/seo";
import { absoluteUrl, routes } from "@/lib/urls";

export const revalidate = 60;

type Props = { params: Promise<{ slug: string }> };

async function loadPost(slug: string) {
  return db.post.findUnique({
    where: { slug },
    include: { category: true, author: true },
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await loadPost(slug);
  if (!post) return {};
  return seoFor("post", post.id, {
    title: post.title,
    description: post.excerpt,
    path: routes.post(post.slug),
    image: post.heroImage,
    type: "article",
    publishedAt: post.publishedAt,
    modifiedAt: post.updatedAt,
  });
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await loadPost(slug);
  if (!post || post.status !== "PUBLISHED") {
    await redirectIfKnown(routes.post(slug));
    notFound();
  }

  const blocks = parseJson<GuideBlock[]>(post.body, []);
  const headings = blocks.filter(
    (block): block is Extract<GuideBlock, { kind: "heading" }> => block.kind === "heading",
  );

  const related = await db.post.findMany({
    where: { status: "PUBLISHED", NOT: { id: post.id } },
    orderBy: { publishedAt: "desc" },
    take: 4,
    select: { id: true, title: true, slug: true, excerpt: true },
  });

  return (
    <SiteChrome>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: post.title,
          description: post.excerpt,
          url: absoluteUrl(routes.post(post.slug)),
          datePublished: post.publishedAt?.toISOString(),
          dateModified: post.updatedAt.toISOString(),
          author: post.author ? { "@type": "Person", name: post.author.name } : undefined,
          publisher: { "@type": "Organization", name: "TenBestFind" },
        }}
      />

      <CrumbBar
        items={[
          { label: "Home", href: "/" },
          { label: "Blog", href: routes.blogIndex() },
          { label: post.title },
        ]}
      />

      <section aria-labelledby="post-h1" style={{ background: "var(--surface-page)" }}>
        <div className="shell" style={{ padding: "48px var(--gutter) 40px", maxWidth: 900 }}>
          <p className="eyebrow" style={{ marginBottom: 14 }}>
            {post.category ? post.category.serviceName : "Editorial"}
          </p>
          <h1 id="post-h1" className="hero__title" style={{ fontSize: "clamp(32px, 3.8vw, 46px)" }}>
            {post.title}
          </h1>
          {post.excerpt ? (
            <p className="hero__lead" style={{ maxWidth: 680 }}>
              {post.excerpt}
            </p>
          ) : null}
          <ul className="hero-meta" style={{ marginTop: 24 }}>
            {post.author ? (
              <li>
                <Icon name="pen" size={16} color="var(--gray-400)" />
                By <Link href={routes.expert(post.author.slug)}>{post.author.name}</Link>
              </li>
            ) : null}
            <li>
              <Icon name="calendar" size={16} color="var(--gray-400)" />
              {monthYear(post.publishedAt)}
            </li>
            <li>
              <EditorialDisclosure />
            </li>
          </ul>
        </div>
      </section>

      <Section ruleTop labelledBy="article-h2">
        <h2 id="article-h2" className="sr-only">
          {post.title}
        </h2>
        <div
          className="split"
          style={{
            display: "grid",
            gridTemplateColumns: "260px minmax(0, 760px)",
            gap: 56,
            alignItems: "start",
          }}
        >
          <div className="toc">
            {headings.length > 1 ? (
              <nav aria-label="In this post">
                <p className="toc__title">In this post</p>
                <ul>
                  {headings.map((heading) => (
                    <li key={heading.id}>
                      <a href={`#${heading.id}`}>{heading.text}</a>
                    </li>
                  ))}
                </ul>
              </nav>
            ) : null}
          </div>

          <article>
            {post.heroImage ? (
              <div className="thumb" style={{ height: 320, marginBottom: 32, borderRadius: 14 }}>
                <Media src={post.heroImage} alt="" />
              </div>
            ) : null}
            <GuideBody blocks={blocks} />
          </article>
        </div>
      </Section>

      {related.length > 0 ? (
        <Section tone="page" labelledBy="related-h2" ruleBottom={false}>
          <SectionHead id="related-h2" title="More from the team" />
          <LinkGrid
            items={related.map((item) => ({
              label: item.title,
              href: routes.post(item.slug),
              meta: item.excerpt ?? undefined,
            }))}
          />
        </Section>
      ) : null}

      <FinalSearch title="Ready to find someone?" />
    </SiteChrome>
  );
}
