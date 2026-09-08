import Link from "next/link";
import { AdminHeader, EmptyState, Panel, StatRow } from "@/components/admin/shell";
import { GuideJobForm } from "@/components/admin/GuideJobForm";
import { RewriteButton } from "@/components/admin/RewriteButton";
import { StatusPill } from "@/components/ui/primitives";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { researchConfigured } from "@/lib/dataforseo";
import { rewriteCandidates } from "@/lib/guide-rewrites";
import { GUIDE_TYPE_LABELS, guideTypeOf } from "@/lib/enums";
import { fullDate } from "@/lib/format";

export const metadata = { title: "Guide writer" };
export const dynamic = "force-dynamic";

export default async function WriterConsole() {
  await requireStaff();

  const [jobs, templates, categories, countries, regions, cities, researchReady, behind] = await Promise.all([
    db.guideJob.findMany({
      orderBy: { createdAt: "desc" },
      take: 60,
      include: {
        template: { select: { name: true } },
        category: { select: { serviceName: true } },
        city: { select: { name: true } },
        region: { select: { name: true } },
        country: { select: { name: true } },
      },
    }),
    db.promptTemplate.findMany({
      where: { kind: "GUIDE", archived: false },
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
      select: { id: true, name: true, isDefault: true, guideType: true },
    }),
    db.category.findMany({ where: { published: true }, orderBy: { sortOrder: "asc" }, select: { id: true, serviceName: true } }),
    db.country.findMany({ where: { published: true }, orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
    db.region.findMany({
      where: { published: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, countryId: true },
    }),
    db.city.findMany({
      where: { published: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, regionId: true, region: { select: { countryId: true } } },
    }),
    researchConfigured(),
    rewriteCandidates(),
  ]);

  const running = jobs.filter((job) => ["QUEUED", "RESEARCHING", "WRITING"].includes(job.status)).length;
  const ready = jobs.filter((job) => job.status === "READY").length;
  const failed = jobs.filter((job) => job.status === "FAILED").length;
  const published = jobs.filter((job) => job.status === "PUBLISHED").length;

  return (
    <>
      <AdminHeader
        title="Guide writer"
        description="Commission a guide. The worker researches the phrase against live search results, writes a draft to the template you pick, and leaves it here for you to accept."
        actions={
          <Link href="/admin/prompts" className="btn btn--secondary btn--sm">
            Prompt templates
          </Link>
        }
      />

      <StatRow
        compact
        stats={[
          { label: "In progress", value: running },
          { label: "Waiting for you", value: ready },
          { label: "Accepted", value: published },
          { label: "Failed", value: failed },
        ]}
      />

      <Panel
        title="Commission a guide"
        description="Nothing is published. A finished draft becomes a guide in Draft status with its author and reviewer left for you to set."
      >
        <GuideJobForm
          researchReady={researchReady}
          templates={templates.map((template) => ({
            id: template.id,
            label: template.name,
            isDefault: template.isDefault,
            guideType: template.guideType,
          }))}
          categories={categories.map((category) => ({ id: category.id, label: category.serviceName }))}
          countries={countries.map((country) => ({ id: country.id, label: country.name }))}
          regions={regions.map((region) => ({
            id: region.id,
            label: region.name,
            countryId: region.countryId,
          }))}
          cities={cities.map((city) => ({
            id: city.id,
            label: city.name,
            countryId: city.region.countryId,
            regionId: city.regionId,
          }))}
        />
      </Panel>

      <Panel
        title="Bring the older guides up to standard"
        description="Guides written before the writer existed are short. A rewrite replaces the page in place rather than publishing a second one, which is how a site ends up competing with itself."
      >
        <RewriteButton
          pending={behind.filter((candidate) => !candidate.hasJob).length}
          words={
            behind.length > 0
              ? Math.round(behind.reduce((sum, candidate) => sum + candidate.words, 0) / behind.length)
              : 0
          }
        />
      </Panel>

      <Panel title="Jobs" padded={false}>
        {jobs.length === 0 ? (
          <div style={{ padding: 24 }}>
            <EmptyState
              title="Nothing commissioned yet"
              body="Fill in the form above and the worker will pick it up within a few seconds."
            />
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Topic</th>
                <th>Hub</th>
                <th>Scope</th>
                <th>Template</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => {
                const scope = [job.category?.serviceName, job.city?.name ?? job.region?.name ?? job.country?.name]
                  .filter(Boolean)
                  .join(" · ");
                return (
                  <tr key={job.id}>
                    <td>
                      <Link href={`/admin/writer/${job.id}`}>{job.topic}</Link>
                      {job.rewriteOfId ? (
                        <span style={{ display: "block", fontSize: 12, color: "var(--text-muted)" }}>
                          rewrite, replaces the page in place
                        </span>
                      ) : null}
                      {job.keyword ? (
                        <span style={{ display: "block", fontSize: 12, color: "var(--text-muted)" }}>
                          {job.keyword}
                        </span>
                      ) : null}
                    </td>
                    <td>{GUIDE_TYPE_LABELS[guideTypeOf(job.guideType)]}</td>
                    <td>{scope || "National"}</td>
                    <td>{job.template?.name ?? "Default"}</td>
                    <td>
                      <StatusPill status={job.status} />
                    </td>
                    <td>{fullDate(job.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Panel>
    </>
  );
}
