import Link from "next/link";
import { AdminHeader, Panel } from "@/components/admin/shell";
import { BatchForm } from "@/components/admin/BatchForm";
import { requireAdmin } from "@/lib/auth";
import { secretStatus } from "@/lib/secrets";
import { db } from "@/lib/db";

export const metadata = { title: "New import batch" };

export default async function NewBatchPage() {
  await requireAdmin();

  const [categories, cities, secrets] = await Promise.all([
    db.category.findMany({ where: { published: true }, orderBy: { sortOrder: "asc" } }),
    db.city.findMany({
      where: { published: true },
      orderBy: [{ name: "asc" }],
      include: { region: true },
    }),
    secretStatus(),
  ]);

  const missing = secrets.filter((secret) => !secret.set);

  return (
    <>
      <AdminHeader
        title="New import batch"
        description="Scrape a service across a set of cities, write a full profile for each company, and score it."
        actions={
          <Link href="/admin/imports" className="btn btn--secondary btn--sm">
            All batches
          </Link>
        }
      />

      {missing.length > 0 ? (
        <p className="form-error" style={{ marginBottom: 24 }}>
          {missing.map((secret) => secret.label).join(" and ")}{" "}
          {missing.length === 1 ? "is" : "are"} not set, so a batch cannot run.{" "}
          <Link href="/admin/integrations">Add the credentials</Link> first.
        </p>
      ) : null}

      <div className="panel-grid panel-grid--wide">
        <Panel title="Define the batch">
          <BatchForm
            categories={categories.map((category) => ({
              id: category.id,
              name: category.name,
              serviceName: category.serviceName,
            }))}
            cities={cities.map((city) => ({
              id: city.id,
              name: city.name,
              region: city.region.name,
              regionId: city.regionId,
            }))}
          />
        </Panel>

        <Panel title="What a batch does" description="In order, one step at a time.">
          <ol style={{ display: "grid", gap: 14, fontSize: 14.5, lineHeight: 1.6, color: "var(--text-secondary)", paddingLeft: 18 }}>
            <li>
              <strong style={{ color: "var(--ink)" }}>Scrape</strong>
              <span style={{ display: "block" }}>
                One Google Maps search per city through Apify. Ratings, review counts and the star
                distribution come across; individual review text does not.
              </span>
            </li>
            <li>
              <strong style={{ color: "var(--ink)" }}>Deduplicate</strong>
              <span style={{ display: "block" }}>
                Checked against everything already in that city by Google place id, then website,
                then phone, then name. The same chain in two cities is two listings, by design.
              </span>
            </li>
            <li>
              <strong style={{ color: "var(--ink)" }}>Find an email</strong>
              <span style={{ display: "block" }}>
                From the Google profile if it has one, otherwise by reading the company's own site.
                A general address such as info@ is preferred over a personal one.
              </span>
            </li>
            <li>
              <strong style={{ color: "var(--ink)" }}>Write</strong>
              <span style={{ display: "block" }}>
                Claude writes the profile from what was actually found: description, editorial take,
                strengths, considerations, services and the questions. It is told not to invent a
                licence, a price or an award. Copy is then cleaned and scored, and rewritten once if
                it falls short.
              </span>
            </li>
            <li>
              <strong style={{ color: "var(--ink)" }}>Publish</strong>
              <span style={{ display: "block" }}>
                Listings at or above your threshold go live with their schema and SEO record.
                Anything weaker waits as a draft.
              </span>
            </li>
          </ol>
        </Panel>
      </div>
    </>
  );
}
