import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminHeader, Panel } from "@/components/admin/shell";
import { PlacementEditor } from "@/components/admin/DirectoryEditors";
import { StatusPill } from "@/components/ui/primitives";
import { fullDate } from "@/lib/format";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata = { title: "Placement" };

type Props = { params: Promise<{ id: string }> };

function isoDate(value: Date | null): string {
  return value ? value.toISOString().slice(0, 10) : "";
}

export default async function AdminPlacementEditor({ params }: Props) {
  await requireStaff();
  const { id } = await params;
  const isNew = id === "new";

  const placement = isNew
    ? null
    : await db.sponsoredPlacement.findUnique({
        where: { id },
        include: { business: { select: { name: true } } },
      });
  if (!isNew && !placement) notFound();

  const [businesses, cities, categories] = await Promise.all([
    db.business.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, city: { select: { name: true } } },
    }),
    db.city.findMany({
      orderBy: [{ region: { name: "asc" } }, { name: "asc" }],
      select: { id: true, name: true, region: { select: { code: true } } },
    }),
    db.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  const ctr =
    placement && placement.impressions
      ? `${((placement.clicks / placement.impressions) * 100).toFixed(1)}%`
      : "—";

  return (
    <>
      <AdminHeader
        title={placement ? placement.business.name : "New placement"}
        description={
          placement
            ? `${placement.kind.replace(/_/g, " ").toLowerCase()} · started ${fullDate(placement.startsAt)}`
            : "Sell a labelled slot. It never buys a ranked position."
        }
        actions={
          <>
            {placement ? <StatusPill status={placement.status} /> : null}
            <Link href="/admin/sponsored" className="btn btn--secondary btn--sm">
              Back to inventory
            </Link>
          </>
        }
      />

      <div className="panel-grid panel-grid--wide">
        <Panel title="Placement">
          <PlacementEditor
            placement={{
              id: placement?.id,
              businessId: placement?.businessId ?? "",
              cityId: placement?.cityId ?? "",
              categoryId: placement?.categoryId ?? "",
              kind: placement?.kind ?? "FEATURED_PARTNER",
              label: placement?.label ?? "Sponsored",
              startsAt: isoDate(placement?.startsAt ?? null),
              endsAt: isoDate(placement?.endsAt ?? null),
              status: placement?.status ?? "ACTIVE",
            }}
            businesses={businesses.map((business) => ({
              id: business.id,
              label: business.city ? `${business.name} (${business.city.name})` : business.name,
            }))}
            cities={cities.map((city) => ({
              id: city.id,
              label: `${city.name}, ${city.region.code.toUpperCase()}`,
            }))}
            categories={categories.map((category) => ({ id: category.id, label: category.name }))}
          />
        </Panel>

        <Panel title="Delivery">
          {placement ? (
            <dl className="transparency__grid" style={{ background: "none", padding: 0 }}>
              <div>
                <dt>Impressions</dt>
                <dd>{placement.impressions.toLocaleString()}</dd>
              </div>
              <div>
                <dt>Clicks</dt>
                <dd>{placement.clicks.toLocaleString()}</dd>
              </div>
              <div>
                <dt>CTR</dt>
                <dd>{ctr}</dd>
              </div>
              <div>
                <dt>Ends</dt>
                <dd>{placement.endsAt ? fullDate(placement.endsAt) : "Open ended"}</dd>
              </div>
            </dl>
          ) : (
            <p style={{ fontSize: 14.5, color: "var(--text-secondary)" }}>
              Delivery numbers start counting once the placement goes live.
            </p>
          )}
          <p
            style={{
              fontSize: 13.5,
              color: "var(--text-secondary)",
              lineHeight: 1.6,
              marginTop: 18,
              paddingTop: 16,
              borderTop: "1px solid var(--border-subtle)",
            }}
          >
            One active featured partner per city and service. If the slot is already held, pause the
            existing placement before selling it again.
          </p>
        </Panel>
      </div>
    </>
  );
}
