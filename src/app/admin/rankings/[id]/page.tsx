import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminHeader, Panel } from "@/components/admin/shell";
import { RankingEditor } from "@/components/admin/RankingEditor";
import { SeoPanel } from "@/components/admin/SeoPanel";
import { markRankingReviewed, setRankingStatus } from "@/app/actions/admin-content";
import { Badge, StatusPill } from "@/components/ui/primitives";
import { fullDate } from "@/lib/format";
import { requireStaff } from "@/lib/auth";
import { parseList, parseRows } from "@/lib/json";
import { db } from "@/lib/db";
import { routes } from "@/lib/urls";

export const metadata = { title: "Ranking" };

type Props = { params: Promise<{ id: string }> };

export default async function AdminRankingDetail({ params }: Props) {
  await requireStaff();
  const { id } = await params;
  const isNew = id === "new";

  const ranking = isNew
    ? null
    : await db.ranking.findUnique({
        where: { id },
        include: {
          category: true,
          city: { include: { region: { include: { country: true } } } },
          criteria: { orderBy: { sortOrder: "asc" } },
          costs: { orderBy: { sortOrder: "asc" } },
          sources: { orderBy: { sortOrder: "asc" } },
          faqs: { orderBy: { sortOrder: "asc" } },
          entries: {
            orderBy: { position: "asc" },
            include: { business: { select: { id: true, name: true } } },
          },
        },
      });
  if (!isNew && !ranking) notFound();

  const [categories, cities, people, businesses, seo] = await Promise.all([
    db.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.city.findMany({
      orderBy: [{ region: { name: "asc" } }, { name: "asc" }],
      select: { id: true, name: true, region: { select: { code: true } } },
    }),
    db.person.findMany({
      where: { published: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, role: true },
    }),
    db.business.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, city: { select: { name: true } } },
    }),
    ranking
      ? db.seoMeta.findUnique({
          where: { entityType_entityId: { entityType: "ranking", entityId: ranking.id } },
        })
      : Promise.resolve(null),
  ]);

  const placement =
    ranking?.cityId != null
      ? await db.sponsoredPlacement.findFirst({
          where: { status: "ACTIVE", cityId: ranking.cityId, categoryId: ranking.categoryId },
          include: { business: { select: { name: true } } },
        })
      : null;

  const publicPath =
    ranking?.city && ranking.category
      ? routes.ranking(
          ranking.city.region.country.code,
          ranking.city.region.slug,
          ranking.city.slug,
          ranking.category.slug,
        )
      : null;

  const contentSample = ranking
    ? [
        ranking.summary ?? "",
        ranking.intro ?? "",
        ...ranking.entries.map((entry) => `${entry.business.name} ${entry.whyPicked ?? ""}`),
        ...ranking.criteria.map((criterion) => `${criterion.title} ${criterion.body}`),
      ].join(" ")
    : "";

  return (
    <>
      <AdminHeader
        title={ranking ? ranking.title : "New ranking"}
        description={
          ranking
            ? `${publicPath ?? "unrouted"} · ${ranking.companiesReviewed} companies reviewed · last reviewed ${fullDate(ranking.lastReviewedAt)}`
            : "Build a Top 10 for one category in one city."
        }
        actions={
          ranking ? (
            <>
              <StatusPill status={ranking.status} />
              <form action={markRankingReviewed}>
                <input type="hidden" name="id" value={ranking.id} />
                <button type="submit" className="btn btn--secondary btn--sm">
                  Mark reviewed
                </button>
              </form>
              <form action={setRankingStatus}>
                <input type="hidden" name="id" value={ranking.id} />
                <input
                  type="hidden"
                  name="status"
                  value={ranking.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED"}
                />
                <button type="submit" className="btn btn--secondary btn--sm">
                  {ranking.status === "PUBLISHED" ? "Unpublish" : "Publish"}
                </button>
              </form>
              {publicPath ? (
                <Link href={publicPath} target="_blank" className="btn btn--secondary btn--sm">
                  View
                </Link>
              ) : null}
            </>
          ) : (
            <Link href="/admin/rankings" className="btn btn--secondary btn--sm">
              Back to rankings
            </Link>
          )
        }
      />

      <div className="panel-grid panel-grid--wide">
        <Panel title="Ranking">
          <RankingEditor
            ranking={{
              id: ranking?.id,
              title: ranking?.title ?? "",
              slug: ranking?.slug ?? "",
              categoryId: ranking?.categoryId ?? "",
              cityId: ranking?.cityId ?? "",
              summary: ranking?.summary ?? "",
              intro: ranking?.intro ?? "",
              methodologyNote: ranking?.methodologyNote ?? "",
              companiesReviewed: String(ranking?.companiesReviewed ?? 0),
              readingMinutes: String(ranking?.readingMinutes ?? 8),
              authorId: ranking?.authorId ?? "",
              reviewerId: ranking?.reviewerId ?? "",
              status: ranking?.status ?? "DRAFT",
              entries:
                ranking?.entries.map((entry) => ({
                  businessId: entry.businessId,
                  designation: entry.designation ?? "",
                  whyPicked: entry.whyPicked ?? "",
                  entryCriteria: parseRows(entry.criteria)
                    .map((row) => (row.text ? `${row.title}: ${row.text}` : row.title))
                    .join("\n"),
                  likes: parseList(entry.likes).join("\n"),
                  concerns: parseList(entry.concerns).join("\n"),
                  sponsored: entry.sponsored ? "yes" : "no",
                })) ?? [],
              criteria:
                ranking?.criteria.map((criterion) => ({
                  title: criterion.title,
                  body: criterion.body,
                  importance: criterion.importance,
                  iconKey: criterion.iconKey ?? "",
                })) ?? [],
              costs:
                ranking?.costs.map((row) => ({
                  label: row.label,
                  unit: row.unit,
                  low: row.lowPrice?.toString() ?? "",
                  high: row.highPrice?.toString() ?? "",
                  typical: row.typical?.toString() ?? "",
                  note: row.note ?? "",
                })) ?? [],
              sources:
                ranking?.sources.map((source) => ({
                  label: source.label,
                  publisher: source.publisher ?? "",
                  tier: source.tier,
                  url: source.url ?? "",
                })) ?? [],
              faqs:
                ranking?.faqs.map((faq) => ({ question: faq.question, answer: faq.answer })) ?? [],
            }}
            categories={categories.map((category) => ({ id: category.id, label: category.name }))}
            cities={cities.map((city) => ({
              id: city.id,
              label: `${city.name}, ${city.region.code.toUpperCase()}`,
            }))}
            people={people.map((person) => ({ id: person.id, label: `${person.name} — ${person.role}` }))}
            businesses={businesses.map((business) => ({
              id: business.id,
              label: business.city ? `${business.name} (${business.city.name})` : business.name,
            }))}
          />
        </Panel>

        <div>
          {ranking ? (
            <>
              <Panel title="Sponsorship">
                <p style={{ fontSize: 14.5, color: "var(--text-secondary)", lineHeight: 1.6 }}>
                  {placement ? (
                    <>
                      <strong style={{ color: "var(--ink)" }}>{placement.business.name}</strong> holds
                      the featured partner slot for this city and category{" "}
                      <Badge tone="gold">Sponsored</Badge>. It sits beside the list, never inside it.
                    </>
                  ) : (
                    "No sponsor holds this city and category. The list publishes with no partner block."
                  )}
                </p>
                <Link
                  href="/admin/sponsored"
                  className="btn btn--secondary btn--sm"
                  style={{ marginTop: 14 }}
                >
                  Manage placements
                </Link>
              </Panel>

              <Panel title="SEO" description="Overrides what this list publishes, field by field.">
                <SeoPanel
                  entityType="ranking"
                  entityId={ranking.id}
                  path={publicPath ?? "/rankings/"}
                  fallbackTitle={ranking.title}
                  fallbackDescription={ranking.summary ?? ""}
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
            </>
          ) : (
            <Panel title="SEO">
              <p style={{ fontSize: 14.5, color: "var(--text-secondary)" }}>
                Save the ranking first, then its SEO record becomes editable here.
              </p>
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}
