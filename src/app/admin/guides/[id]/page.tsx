import Link from "next/link";
import { notFound } from "next/navigation";
import type { GuideBlock } from "../../../../../prisma/data/editorial";
import { AdminHeader, Panel } from "@/components/admin/shell";
import { GuideEditor } from "@/components/admin/GuideEditor";
import { SeoPanel } from "@/components/admin/SeoPanel";
import { setGuideStatus } from "@/app/actions/admin-content";
import { StatusPill } from "@/components/ui/primitives";
import { fullDate } from "@/lib/format";
import { requireStaff } from "@/lib/auth";
import { parseIllustrations } from "@/lib/guide-images";
import { parseJson, parseList } from "@/lib/json";
import { db } from "@/lib/db";
import { GUIDE_TYPE_LABELS, guideTypeOf } from "@/lib/enums";

export const metadata = { title: "Guide" };

type Props = { params: Promise<{ id: string }> };

export default async function AdminGuideDetail({ params }: Props) {
  await requireStaff();
  const { id } = await params;
  const isNew = id === "new";

  const guide = isNew
    ? null
    : await db.guide.findUnique({
        where: { id },
        include: {
          sources: { orderBy: { sortOrder: "asc" } },
          costs: { orderBy: { sortOrder: "asc" } },
          faqs: { orderBy: { sortOrder: "asc" } },
        },
      });
  if (!isNew && !guide) notFound();

  const [categories, people, seo] = await Promise.all([
    db.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.person.findMany({
      where: { published: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, role: true },
    }),
    guide
      ? db.seoMeta.findUnique({
          where: { entityType_entityId: { entityType: "guide", entityId: guide.id } },
        })
      : Promise.resolve(null),
  ]);

  const blocks = guide ? parseJson<GuideBlock[]>(guide.body, []) : [];
  const illustrations = guide ? parseIllustrations(guide.illustrations) : [];
  const contentSample = guide
    ? [
        guide.shortAnswer ?? "",
        ...parseList(guide.keyTakeaways),
        ...blocks.map((block) =>
          block.kind === "paragraph" || block.kind === "heading"
            ? block.text
            : block.kind === "list"
              ? block.items.join(" ")
              : block.kind === "steps"
                ? block.items.map((item) => `${item.title} ${item.body}`).join(" ")
                : "",
        ),
      ].join(" ")
    : "";

  return (
    <>
      <AdminHeader
        title={guide ? guide.title : "New guide"}
        description={
          guide
            ? `/guides/${guide.slug}/ · ${GUIDE_TYPE_LABELS[guideTypeOf(guide.type)].toLowerCase()} · updated ${fullDate(guide.updatedAt)}`
            : "Write an editorial or cost guide."
        }
        actions={
          guide ? (
            <>
              <StatusPill status={guide.status} />
              <form action={setGuideStatus}>
                <input type="hidden" name="id" value={guide.id} />
                <input
                  type="hidden"
                  name="status"
                  value={guide.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED"}
                />
                <button type="submit" className="btn btn--secondary btn--sm">
                  {guide.status === "PUBLISHED" ? "Unpublish" : "Publish"}
                </button>
              </form>
              <Link href={`/guides/${guide.slug}/`} target="_blank" className="btn btn--secondary btn--sm">
                View guide
              </Link>
            </>
          ) : (
            <Link href="/admin/guides" className="btn btn--secondary btn--sm">
              Back to guides
            </Link>
          )
        }
      />

      {illustrations.length > 0 ? (
        <Panel
          title="Pictures"
          description="What this guide asked to be photographed. Generate each one from the brief exactly as written, then run the ingest so the files land in the media volume and the figure blocks start rendering."
        >
          <div style={{ display: "grid", gap: 18 }}>
            {illustrations.map((illustration) => (
              <div
                key={illustration.key}
                style={{
                  display: "grid",
                  gridTemplateColumns: illustration.path ? "160px 1fr" : "1fr",
                  gap: 16,
                  alignItems: "start",
                  paddingBottom: 18,
                  borderBottom: "1px solid var(--border-subtle)",
                }}
              >
                {illustration.path ? (
                  // eslint-disable-next-line @next/next/no-img-element -- one thumbnail in an admin list
                  <img
                    src={illustration.path}
                    alt={illustration.alt}
                    style={{ width: "100%", borderRadius: 10, border: "1px solid var(--border-subtle)" }}
                  />
                ) : null}
                <div>
                  <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>
                    <code>{illustration.key}</code> · {illustration.slot}
                    {illustration.path ? " · made" : " · not made yet"}
                  </p>
                  <p style={{ fontSize: 14, lineHeight: 1.65, marginBottom: 8 }}>{illustration.scene}</p>
                  <p style={{ fontSize: 12.5, color: "var(--text-muted)" }}>
                    Alt: {illustration.alt}
                    {illustration.caption ? ` · Caption: ${illustration.caption}` : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      ) : null}

      <div className="panel-grid panel-grid--wide">
        <Panel title="Guide content">
          <GuideEditor
            guide={{
              id: guide?.id,
              title: guide?.title ?? "",
              slug: guide?.slug ?? "",
              type: guide?.type ?? "HOW_TO_CHOOSE",
              categoryId: guide?.categoryId ?? "",
              authorId: guide?.authorId ?? "",
              reviewerId: guide?.reviewerId ?? "",
              excerpt: guide?.excerpt ?? "",
              shortAnswer: guide?.shortAnswer ?? "",
              bottomLine: guide?.bottomLine ?? "",
              heroImage: guide?.heroImage ?? "",
              readingMinutes: String(guide?.readingMinutes ?? 9),
              typicalLow: guide?.typicalLow?.toString() ?? "",
              typicalHigh: guide?.typicalHigh?.toString() ?? "",
              unitLow: guide?.unitLow?.toString() ?? "",
              unitHigh: guide?.unitHigh?.toString() ?? "",
              unitLabel: guide?.unitLabel ?? "",
              status: guide?.status ?? "DRAFT",
              keyTakeaways: guide ? parseList(guide.keyTakeaways) : [],
              body: blocks,
              costs:
                guide?.costs.map((row) => ({
                  label: row.label,
                  group: row.group ?? "",
                  unit: row.unit,
                  low: row.lowPrice?.toString() ?? "",
                  high: row.highPrice?.toString() ?? "",
                  typical: row.typical?.toString() ?? "",
                  note: row.note ?? "",
                })) ?? [],
              sources:
                guide?.sources.map((source) => ({
                  label: source.label,
                  publisher: source.publisher ?? "",
                  tier: source.tier,
                  url: source.url ?? "",
                })) ?? [],
              faqs:
                guide?.faqs.map((faq) => ({ question: faq.question, answer: faq.answer })) ?? [],
            }}
            categories={categories.map((category) => ({ id: category.id, label: category.name }))}
            people={people.map((person) => ({ id: person.id, label: `${person.name} — ${person.role}` }))}
          />
        </Panel>

        {guide ? (
          <Panel title="SEO" description="Overrides what the public guide publishes, field by field.">
            <SeoPanel
              entityType="guide"
              entityId={guide.id}
              path={`/guides/${guide.slug}/`}
              fallbackTitle={guide.title}
              fallbackDescription={guide.excerpt ?? ""}
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
              Save the guide first, then its SEO record becomes editable here.
            </p>
          </Panel>
        )}
      </div>
    </>
  );
}
