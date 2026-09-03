import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminHeader, BarChart, Panel, StatRow, TrendChart } from "@/components/admin/shell";
import { BusinessEditor } from "@/components/admin/BusinessEditor";
import { BillingPortalButton } from "@/components/admin/BillingControls";
import { SeoPanel } from "@/components/admin/SeoPanel";
import {
  addToRanking,
  deleteBusiness,
  removeFromRanking,
  setBusinessStatus,
  setCredentialStatus,
  setRankingPosition,
} from "@/app/actions/admin-content";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { publishListing } from "@/app/actions/admin-billing";
import { Badge, StatusPill } from "@/components/ui/primitives";
import { fullDate, money, percentChange } from "@/lib/format";
import { requireStaff } from "@/lib/auth";
import { dailySeries, previousTotals, totalsFor } from "@/lib/analytics";
import { parseJson, parseList } from "@/lib/json";
import { db } from "@/lib/db";
import { routes } from "@/lib/urls";

export const metadata = { title: "Business" };

type OpeningHours = { day: string; opens?: string; closes?: string; closed?: boolean };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> };

const TABS = [
  { key: "profile", label: "Profile & verification" },
  { key: "billing", label: "Billing & plan" },
  { key: "analytics", label: "Listing analytics" },
  { key: "seo", label: "SEO" },
];

export default async function AdminBusinessDetail({ params, searchParams }: Props) {
  await requireStaff();
  const { id } = await params;
  const tab = (await searchParams).tab ?? "profile";

  const business = await db.business.findUnique({
    where: { id },
    include: {
      category: true,
      city: { include: { region: { include: { country: true } } } },
      owner: true,
      credentials: { orderBy: { sortOrder: "asc" } },
      photos: { orderBy: { sortOrder: "asc" } },
      services: { include: { subservice: true } },
      areas: { include: { city: true } },
      entries: { include: { ranking: { include: { category: true, city: true } } }, orderBy: { position: "asc" } },
      subscriptions: {
        include: { plan: true, invoices: { orderBy: { issuedAt: "desc" } } },
        orderBy: { createdAt: "desc" },
      },
      placements: { include: { city: true, category: true } },
    },
  });
  if (!business) notFound();

  const [categories, cities, subservices] = await Promise.all([
    db.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.city.findMany({
      orderBy: [{ region: { name: "asc" } }, { name: "asc" }],
      select: { id: true, name: true, region: { select: { code: true } } },
    }),
    db.subservice.findMany({
      orderBy: [{ category: { name: "asc" } }, { sortOrder: "asc" }],
      select: { id: true, name: true, categoryId: true, category: { select: { name: true } } },
    }),
  ]);

  // The lists this company could be added to: same trade, and either the city
  // it sits in or a list with no city of its own.
  const joinable = await db.ranking.findMany({
    where: {
      categoryId: business.categoryId,
      ...(business.cityId ? { OR: [{ cityId: business.cityId }, { cityId: null }] } : {}),
      entries: { none: { businessId: business.id } },
    },
    orderBy: { title: "asc" },
    select: { id: true, title: true, status: true },
    take: 20,
  });

  const [seo, totals, previous, series, events] = await Promise.all([
    db.seoMeta.findUnique({
      where: { entityType_entityId: { entityType: "business", entityId: business.id } },
    }),
    totalsFor(30, business.id),
    previousTotals(30, business.id),
    dailySeries(30, business.id),
    db.analyticsEvent.findMany({
      where: { businessId: business.id },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
  ]);

  const subscription = business.subscriptions[0];
  const invoices = subscription?.invoices ?? [];
  const lifetime = business.subscriptions
    .flatMap((sub) => sub.invoices)
    .filter((invoice) => invoice.status === "PAID")
    .reduce((total, invoice) => total + invoice.amountCents, 0);

  const contactActions = totals.websiteClicks + totals.phoneClicks + totals.quoteClicks;
  const previousContacts = previous.websiteClicks + previous.phoneClicks + previous.quoteClicks;

  return (
    <>
      <AdminHeader
        title={business.name}
        description={`${business.category.name}${business.city ? ` · ${business.city.name}, ${business.city.region.code.toUpperCase()}` : ""}`}
        actions={
          <>
            <StatusPill status={business.status} />
            {business.status === "PENDING" ? (
              <form action={publishListing}>
                <input type="hidden" name="id" value={business.id} />
                <button type="submit" className="btn btn--primary btn--sm">
                  Publish and start billing
                </button>
              </form>
            ) : null}
            {business.status === "PUBLISHED" ? (
              <Link href={routes.business(business.slug)} target="_blank" className="btn btn--secondary btn--sm">
                View profile
              </Link>
            ) : null}
          </>
        }
      />

      <div className="admin-tabs">
        {TABS.map((item) => (
          <Link
            key={item.key}
            href={`/admin/businesses/${business.id}?tab=${item.key}`}
            data-on={tab === item.key}
          >
            {item.label}
          </Link>
        ))}
      </div>

      {tab === "profile" ? (
        <div className="panel-grid panel-grid--wide">
          <Panel title="Profile">
            <BusinessEditor
              business={{
                id: business.id,
                name: business.name,
                slug: business.slug,
                categoryId: business.categoryId,
                cityId: business.cityId ?? "",
                status: business.status,
                tagline: business.tagline ?? "",
                description: business.description ?? "",
                bestFor: business.bestFor ?? "",
                editorialTake: business.editorialTake ?? "",
                strengths: parseList(business.strengths),
                considerations: parseList(business.considerations),
                logoUrl: business.logoUrl ?? "",
                website: business.website ?? "",
                phone: business.phone ?? "",
                email: business.email ?? "",
                addressLine: business.addressLine ?? "",
                postalCode: business.postalCode ?? "",
                yearFounded: business.yearFounded?.toString() ?? "",
                employeeCount: business.employeeCount ?? "",
                licenseNumber: business.licenseNumber ?? "",
                warrantyTerms: business.warrantyTerms ?? "",
                emergency: business.emergency,
                financing: business.financing,
                freeEstimates: business.freeEstimates,
                verified: business.verified,
                claimed: business.claimed,
                googleRating: business.googleRating?.toString() ?? "",
                googleReviewCount: business.googleReviewCount?.toString() ?? "",
                hours: parseJson<OpeningHours[]>(business.hours, []).map((row) => ({
                  day: row.day,
                  opens: row.opens ?? "",
                  closes: row.closes ?? "",
                  closed: row.closed ? "yes" : "no",
                })),
                services: business.services.map((row) => row.subserviceId),
                areas: business.areas.map((row) => row.cityId),
                credentials: business.credentials.map((credential) => ({
                  label: credential.label,
                  identifier: credential.identifier ?? "",
                  authority: credential.authority ?? "",
                  status: credential.status,
                  sourceUrl: credential.sourceUrl ?? "",
                })),
                photos: business.photos.map((photo) => ({
                  url: photo.url,
                  alt: photo.alt ?? "",
                })),
              }}
              categories={categories.map((category) => ({ id: category.id, label: category.name }))}
              cities={cities.map((city) => ({
                id: city.id,
                label: `${city.name}, ${city.region.code.toUpperCase()}`,
              }))}
              subservices={subservices.map((sub) => ({
                id: sub.id,
                label: sub.name,
                group: sub.category.name,
                categoryId: sub.categoryId,
              }))}
            />
          </Panel>

          <div>
            <Panel
              title="Credentials"
              description="Verified means checked against the issuing authority."
              padded={false}
            >
              {business.credentials.length === 0 ? (
                <div className="panel__body">
                  <p style={{ fontSize: 14.5, color: "var(--text-secondary)" }}>
                    No credentials recorded.
                  </p>
                </div>
              ) : (
                <div className="table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th scope="col">Credential</th>
                        <th scope="col">Status</th>
                        <th scope="col" />
                      </tr>
                    </thead>
                    <tbody>
                      {business.credentials.map((credential) => (
                        <tr key={credential.id}>
                          <td>
                            <span className="admin-table__primary">{credential.label}</span>
                            <span className="admin-table__meta">
                              {credential.authority ?? "Authority not recorded"}
                              {credential.checkedAt ? ` · checked ${fullDate(credential.checkedAt)}` : ""}
                            </span>
                          </td>
                          <td>
                            <StatusPill status={credential.status} />
                          </td>
                          <td>
                            <form action={setCredentialStatus} className="admin-table__actions">
                              <input type="hidden" name="id" value={credential.id} />
                              <input
                                type="hidden"
                                name="status"
                                value={credential.status === "VERIFIED" ? "REPORTED" : "VERIFIED"}
                              />
                              <button type="submit" className="btn btn--ghost btn--sm">
                                {credential.status === "VERIFIED" ? "Mark reported" : "Mark verified"}
                              </button>
                            </form>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>

            <Panel title="Editorial standing">
              <dl className="transparency__grid" style={{ background: "none", padding: 0 }}>
                <div>
                  <dt>Claimed</dt>
                  <dd>{business.claimed ? `Yes, by ${business.owner?.name ?? "the owner"}` : "No"}</dd>
                </div>
                <div>
                  <dt>Rankings</dt>
                  <dd>
                    {business.entries.length === 0
                      ? "Not ranked"
                      : business.entries
                          .map((entry) => `#${entry.position} ${entry.ranking.category.name}`)
                          .join(", ")}
                  </dd>
                </div>
                <div>
                  <dt>Sponsored placements</dt>
                  <dd>
                    {business.placements.length === 0
                      ? "None"
                      : business.placements
                          .map((placement) => `${placement.city?.name ?? "All"} ${placement.kind.toLowerCase()}`)
                          .join(", ")}
                  </dd>
                </div>
                <div>
                  <dt>Services listed</dt>
                  <dd>{business.services.length}</dd>
                </div>
              </dl>
              {parseList(business.strengths).length > 0 ? (
                <p style={{ marginTop: 18, fontSize: 13.5, color: "var(--text-muted)" }}>
                  {parseList(business.strengths).length} strengths and{" "}
                  {parseList(business.considerations).length} considerations recorded for the ranking
                  card.
                </p>
              ) : null}
            </Panel>

            <Panel
              title="Ranking positions"
              description="Set where this company sits on each list. Everything else shifts to keep the order 1 upwards."
              padded={business.entries.length === 0}
            >
              {business.entries.length === 0 ? (
                <p style={{ fontSize: 14.5, color: "var(--text-secondary)" }}>
                  Not on any list yet.
                </p>
              ) : (
                <div className="table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th scope="col">List</th>
                        <th scope="col">Position</th>
                        <th scope="col" />
                      </tr>
                    </thead>
                    <tbody>
                      {business.entries.map((entry) => (
                        <tr key={entry.id}>
                          <td>
                            <Link
                              href={`/admin/rankings/${entry.rankingId}`}
                              className="admin-table__primary"
                            >
                              {entry.ranking.title}
                            </Link>
                            <span className="admin-table__meta">
                              {entry.ranking.city?.name ?? "No city"} · {entry.ranking.status.toLowerCase()}
                              {entry.sponsored ? " · sponsored" : ""}
                            </span>
                          </td>
                          <td>
                            <form action={setRankingPosition} className="admin-table__actions">
                              <input type="hidden" name="entryId" value={entry.id} />
                              <input
                                type="number"
                                name="position"
                                min={1}
                                max={50}
                                defaultValue={entry.position}
                                aria-label={`Position on ${entry.ranking.title}`}
                                style={{ width: 72 }}
                              />
                              <button type="submit" className="btn btn--secondary btn--sm">
                                Move
                              </button>
                            </form>
                          </td>
                          <td>
                            <form action={removeFromRanking} className="admin-table__actions">
                              <input type="hidden" name="entryId" value={entry.id} />
                              <ConfirmButton
                                question={`Take ${business.name} off ${entry.ranking.title}?`}
                              >
                                Remove
                              </ConfirmButton>
                            </form>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {joinable.length > 0 ? (
                <form
                  action={addToRanking}
                  className="panel__body"
                  style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}
                >
                  <input type="hidden" name="businessId" value={business.id} />
                  <label className="field" style={{ flex: "1 1 220px", margin: 0 }}>
                    <span>Add to a list</span>
                    <select name="rankingId" defaultValue={joinable[0].id}>
                      {joinable.map((ranking) => (
                        <option key={ranking.id} value={ranking.id}>
                          {ranking.title}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button type="submit" className="btn btn--secondary btn--sm">
                    Add at the bottom
                  </button>
                </form>
              ) : null}
            </Panel>

            <Panel
              title="Status and removal"
              description="Suspending hides the profile but keeps everything. Deleting only works when nothing depends on the company."
            >
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {business.status === "SUSPENDED" ? (
                  <form action={setBusinessStatus}>
                    <input type="hidden" name="id" value={business.id} />
                    <input type="hidden" name="status" value="PUBLISHED" />
                    <button type="submit" className="btn btn--primary btn--sm">
                      Lift the suspension
                    </button>
                  </form>
                ) : (
                  <form action={setBusinessStatus}>
                    <input type="hidden" name="id" value={business.id} />
                    <input type="hidden" name="status" value="SUSPENDED" />
                    <ConfirmButton
                      className="btn btn--secondary btn--sm"
                      question={`Suspend ${business.name}? The profile stops showing on the site until you lift it.`}
                    >
                      Suspend
                    </ConfirmButton>
                  </form>
                )}

                {business.status === "ARCHIVED" ? null : (
                  <form action={setBusinessStatus}>
                    <input type="hidden" name="id" value={business.id} />
                    <input type="hidden" name="status" value="ARCHIVED" />
                    <ConfirmButton
                      question={`Archive ${business.name}? Use this when the company has closed for good.`}
                    >
                      Archive
                    </ConfirmButton>
                  </form>
                )}

                <form action={deleteBusiness}>
                  <input type="hidden" name="id" value={business.id} />
                  <ConfirmButton
                    className="btn btn--danger btn--sm"
                    question={`Delete ${business.name} permanently? This cannot be undone.`}
                  >
                    Delete
                  </ConfirmButton>
                </form>
              </div>

              {business.entries.length > 0 || business.subscriptions.length > 0 ? (
                <p style={{ marginTop: 14, fontSize: 13.5, color: "var(--text-muted)" }}>
                  This company is on {business.entries.length} list
                  {business.entries.length === 1 ? "" : "s"} and has{" "}
                  {business.subscriptions.length} billing record
                  {business.subscriptions.length === 1 ? "" : "s"}, so deleting archives it instead.
                  Take it off the lists first if you want it gone completely.
                </p>
              ) : null}
            </Panel>
          </div>
        </div>
      ) : null}

      {tab === "billing" ? (
        <>
          <StatRow
            stats={[
              { label: "Plan", value: subscription?.plan.name ?? "None" },
              {
                label: "Amount",
                value: subscription ? `${money(subscription.plan.priceCents)}/mo` : "—",
              },
              {
                label: "Next charge",
                value: subscription?.currentPeriodEnd ? fullDate(subscription.currentPeriodEnd) : "—",
              },
              { label: "Lifetime value", value: money(lifetime) },
            ]}
          />

          <Panel title="Subscription">
            {subscription ? (
              <>
                <dl className="transparency__grid" style={{ background: "none", padding: 0 }}>
                  <div>
                    <dt>Status</dt>
                    <dd>
                      <StatusPill status={subscription.status} />
                      {subscription.cancelAtPeriodEnd ? (
                        <span style={{ display: "block", marginTop: 4, fontSize: 13, color: "var(--text-muted)" }}>
                          Cancels at period end
                        </span>
                      ) : null}
                    </dd>
                  </div>
                  <div>
                    <dt>Started</dt>
                    <dd>{fullDate(subscription.startedAt)}</dd>
                  </div>
                  <div>
                    <dt>Current period ends</dt>
                    <dd>{fullDate(subscription.currentPeriodEnd)}</dd>
                  </div>
                  <div>
                    <dt>Billing contact</dt>
                    <dd>{business.owner?.email ?? business.email ?? "Not recorded"}</dd>
                  </div>
                  <div>
                    <dt>Stripe customer</dt>
                    <dd>
                      {business.stripeCustomerId ? (
                        <span style={{ fontSize: 13 }}>{business.stripeCustomerId}</span>
                      ) : (
                        <Badge tone="neutral">Not linked</Badge>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>Stripe subscription</dt>
                    <dd>
                      {subscription.stripeSubscriptionId ? (
                        <span style={{ fontSize: 13 }}>{subscription.stripeSubscriptionId}</span>
                      ) : (
                        <Badge tone="warning">Recorded locally only</Badge>
                      )}
                    </dd>
                  </div>
                </dl>
                {business.stripeCustomerId ? (
                  <div style={{ marginTop: 20, paddingTop: 18, borderTop: "1px solid var(--border-subtle)" }}>
                    <BillingPortalButton businessId={business.id} />
                    <p style={{ marginTop: 10, fontSize: 13, color: "var(--text-muted)" }}>
                      Opens Stripe&apos;s own portal, where the owner can update a card, download
                      receipts or cancel.
                    </p>
                  </div>
                ) : null}
              </>
            ) : (
              <p style={{ fontSize: 14.5, color: "var(--text-secondary)" }}>
                No subscription. This listing is maintained editorially.
              </p>
            )}
          </Panel>

          <Panel title="Invoices" padded={invoices.length === 0}>
            {invoices.length === 0 ? (
              <p style={{ fontSize: 14.5, color: "var(--text-secondary)" }}>No invoices yet.</p>
            ) : (
              <div className="table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th scope="col">Number</th>
                      <th scope="col">Issued</th>
                      <th scope="col">Period</th>
                      <th scope="col">Amount</th>
                      <th scope="col">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((invoice) => (
                      <tr key={invoice.id}>
                        <td className="admin-table__primary">{invoice.number}</td>
                        <td>{fullDate(invoice.issuedAt)}</td>
                        <td>
                          {fullDate(invoice.periodStart)} – {fullDate(invoice.periodEnd)}
                        </td>
                        <td className="admin-table__num">{money(invoice.amountCents, invoice.currency)}</td>
                        <td>
                          <StatusPill status={invoice.status} />
                          {invoice.hostedUrl ? (
                            <span className="admin-table__meta">
                              <a href={invoice.hostedUrl} target="_blank" rel="noopener noreferrer">
                                View in Stripe
                              </a>
                            </span>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </>
      ) : null}

      {tab === "analytics" ? (
        <>
          <StatRow
            stats={[
              {
                label: "Impressions",
                value: totals.impressions,
                delta: percentChange(totals.impressions, previous.impressions),
              },
              {
                label: "Profile views",
                value: totals.profileViews,
                delta: percentChange(totals.profileViews, previous.profileViews),
              },
              {
                label: "Contact actions",
                value: contactActions,
                delta: percentChange(contactActions, previousContacts),
              },
              {
                label: "Quote requests",
                value: totals.quoteClicks,
                delta: percentChange(totals.quoteClicks, previous.quoteClicks),
              },
            ]}
          />

          <div className="panel-grid panel-grid--wide">
            <Panel title="Profile views, last 30 days">
              <TrendChart series={series} />
            </Panel>
            <Panel title="Actions breakdown">
              <BarChart
                data={[
                  { label: "Impressions in lists", value: totals.impressions },
                  { label: "Profile views", value: totals.profileViews },
                  { label: "Website clicks", value: totals.websiteClicks },
                  { label: "Phone clicks", value: totals.phoneClicks },
                  { label: "Quote requests", value: totals.quoteClicks },
                  { label: "Direction requests", value: totals.directionsClicks },
                ]}
              />
            </Panel>
          </div>

          <Panel title="Recent events" padded={events.length === 0}>
            {events.length === 0 ? (
              <p style={{ fontSize: 14.5, color: "var(--text-secondary)" }}>No events recorded yet.</p>
            ) : (
              <div className="table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th scope="col">Event</th>
                      <th scope="col">Path</th>
                      <th scope="col">Device</th>
                      <th scope="col">When</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((event) => (
                      <tr key={event.id}>
                        <td className="admin-table__primary">{event.type.replace(/_/g, " ").toLowerCase()}</td>
                        <td style={{ color: "var(--text-secondary)" }}>{event.path}</td>
                        <td>{event.device ?? "—"}</td>
                        <td>{fullDate(event.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </>
      ) : null}

      {tab === "seo" ? (
        <Panel title="SEO">
          <SeoPanel
            entityType="business"
            entityId={business.id}
            path={routes.business(business.slug)}
            fallbackTitle={`${business.name} — ${business.category.serviceName}${business.city ? ` in ${business.city.name}` : ""}`}
            fallbackDescription={business.description ?? ""}
            contentSample={[business.description, business.editorialTake, business.bestFor]
              .filter(Boolean)
              .join(" ")}
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
      ) : null}
    </>
  );
}
