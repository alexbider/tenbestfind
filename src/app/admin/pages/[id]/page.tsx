import Link from "next/link";
import { notFound } from "next/navigation";
import type { GuideBlock } from "../../../../../prisma/data/editorial";
import { AdminHeader, Panel } from "@/components/admin/shell";
import { PageEditor } from "@/components/admin/PageEditor";
import { SeoPanel } from "@/components/admin/SeoPanel";
import { StatusPill } from "@/components/ui/primitives";
import { fullDate } from "@/lib/format";
import { requireStaff } from "@/lib/auth";
import { parseJson, parseList } from "@/lib/json";
import { db } from "@/lib/db";

export const metadata = { title: "Edit page" };

type Props = { params: Promise<{ id: string }> };

export default async function AdminPageEditor({ params }: Props) {
  await requireStaff();
  const { id } = await params;

  const isNew = id === "new";
  const page = isNew
    ? null
    : await db.page.findUnique({
        where: { id },
        include: { faqs: { orderBy: { sortOrder: "asc" } } },
      });
  if (!isNew && !page) notFound();

  const seo = page
    ? await db.seoMeta.findUnique({ where: { entityType_entityId: { entityType: "page", entityId: page.id } } })
    : null;

  const blocks = page ? parseJson<GuideBlock[]>(page.body, []) : [];
  const contentSample = blocks
    .map((block) =>
      block.kind === "paragraph"
        ? block.text
        : block.kind === "heading"
          ? block.text
          : block.kind === "list"
            ? block.items.join(" ")
            : "",
    )
    .join(" ");

  return (
    <>
      <AdminHeader
        title={page ? page.title : "New page"}
        description={page ? `/${page.slug}/ · last updated ${fullDate(page.updatedAt)}` : "Create a static page."}
        actions={
          page ? (
            <>
              <StatusPill status={page.status} />
              <Link href={`/${page.slug}/`} target="_blank" className="btn btn--secondary btn--sm">
                View page
              </Link>
            </>
          ) : null
        }
      />

      <div className="panel-grid panel-grid--wide">
        <Panel title="Page content">
          <PageEditor
            page={{
              id: page?.id,
              title: page?.title ?? "",
              slug: page?.slug ?? "",
              template: page?.template ?? "document",
              excerpt: page?.excerpt ?? "",
              noticeTitle: page?.noticeTitle ?? "",
              noticeBody: page?.noticeBody ?? "",
              printable: page?.printable ?? false,
              status: page?.status ?? "DRAFT",
              body: blocks,
              faqs: page?.faqs.map((faq) => ({ question: faq.question, answer: faq.answer })) ?? [],
            }}
          />
        </Panel>

        {page ? (
          <Panel title="SEO" description="Overrides what the public page publishes, field by field.">
            <SeoPanel
              entityType="page"
              entityId={page.id}
              path={`/${page.slug}/`}
              fallbackTitle={page.title}
              fallbackDescription={page.excerpt ?? ""}
              contentSample={contentSample}
              record={
                seo
                  ? {
                      title: seo.title,
                      description: seo.description,
                      canonical: seo.canonical,
                      focusKeyword: seo.focusKeyword,
                      extraKeywords: parseList(seo.extraKeywords),
                      breadcrumbTitle: seo.breadcrumbTitle,
                      robotsIndex: seo.robotsIndex,
                      robotsFollow: seo.robotsFollow,
                      robotsNoArchive: seo.robotsNoArchive,
                      robotsNoSnippet: seo.robotsNoSnippet,
                      robotsNoImageIndex: seo.robotsNoImageIndex,
                      maxImagePreview: seo.maxImagePreview,
                      ogTitle: seo.ogTitle,
                      ogDescription: seo.ogDescription,
                      ogImage: seo.ogImage,
                      twitterCard: seo.twitterCard,
                      schemaType: seo.schemaType,
                      schemaJson: seo.schemaJson,
                      score: seo.score,
                    }
                  : null
              }
            />
          </Panel>
        ) : (
          <Panel title="SEO">
            <p style={{ fontSize: 14.5, color: "var(--text-secondary)" }}>
              Save the page first, then its SEO record becomes editable here.
            </p>
          </Panel>
        )}
      </div>
    </>
  );
}
