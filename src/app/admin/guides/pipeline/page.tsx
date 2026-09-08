import Link from "next/link";
import { AdminHeader, EmptyState, Panel, StatRow } from "@/components/admin/shell";
import { GuideJobForm } from "@/components/admin/GuideJobForm";
import { RewriteButton } from "@/components/admin/RewriteButton";
import { StatusPill } from "@/components/ui/primitives";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { researchConfigured } from "@/lib/dataforseo";
import { rewriteCandidates } from "@/lib/guide-rewrites";
import { GUIDE_JOB_MEANING, type GuideJobStatus } from "@/lib/guide-jobs";
import { GUIDE_TYPE_LABELS, guideTypeOf } from "@/lib/enums";
import { fullDate } from "@/lib/format";

export const metadata = { title: "Pipeline" };
export const dynamic = "force-dynamic";

const META = { display: "block", fontSize: 12, color: "var(--text-muted)" } as const;

/**
 * Every commission, and what is happening to it.
 *
 * This screen does not write anything. Claude writes the guides through the
 * connector, and what is left here is the part a person needs: commissioning
 * work, seeing where each piece has got to, and reading a draft before it
 * becomes a page. The research is still bought on this side, because the
 * credentials are here and a phrase should be paid for once.
 */
export default async function GuidePipeline() {
  await requireStaff();

  const [jobs, templates, categories, countries, regions, cities, researchReady, behind, feed] = await Promise.all([
    db.guideJob.findMany({
      orderBy: { updatedAt: "desc" },
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
    db.guideJobEvent.findMany({
      orderBy: { at: "desc" },
      take: 12,
      include: { job: { select: { id: true, topic: true } } },
    }),
  ]);

  const waiting = jobs.filter((job) => job.status === "BRIEFED").length;
  const writing = jobs.filter((job) => job.status === "WRITING").length;
  const drafted = jobs.filter((job) => job.status === "DRAFTED").length;
  const failed = jobs.filter((job) => job.status === "FAILED").length;

  return (
    <>
      <AdminHeader
        title="Pipeline"
        description="Commission a guide here. This side buys the search data and holds the brief; Claude writes it through the connector and hands the draft back for you to read."
        actions={
          <Link href="/admin/guides/briefs" className="btn btn--secondary btn--sm">
            House briefs
          </Link>
        }
      />

      <StatRow
        compact
        stats={[
          { label: "Ready to write", value: waiting, hint: "Briefed, nobody has picked them up" },
          { label: "Being written", value: writing },
          { label: "Waiting for you", value: drafted, hint: "A draft is in and needs reading" },
          { label: "Stopped", value: failed },
        ]}
      />

      <Panel
        title="Commission a guide"
        description="The search data is bought straight away. After that it sits at Briefed until a writer picks it up, and nothing is ever published without somebody putting their name on it."
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
        description="A rewrite replaces the page in place rather than publishing a second one, which is how a site ends up competing with itself."
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

      <Panel title="Commissions" padded={jobs.length === 0}>
        {jobs.length === 0 ? (
          <EmptyState
            title="Nothing commissioned yet"
            body="Fill in the form above, or ask Claude to commission one through the connector."
          />
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Topic</th>
                <th>Kind</th>
                <th>Scope</th>
                <th>Writer</th>
                <th>Status</th>
                <th>Updated</th>
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
                      <Link href={`/admin/guides/pipeline/${job.id}`}>{job.topic}</Link>
                      {job.rewriteOfId ? <span style={META}>rewrite, replaces the page in place</span> : null}
                      {job.keyword ? <span style={META}>{job.keyword}</span> : null}
                    </td>
                    <td>{GUIDE_TYPE_LABELS[guideTypeOf(job.guideType)]}</td>
                    <td>{scope || "National"}</td>
                    <td>{job.writer ?? "—"}</td>
                    <td title={GUIDE_JOB_MEANING[job.status as GuideJobStatus] ?? ""}>
                      <StatusPill status={job.status} />
                    </td>
                    <td>{fullDate(job.updatedAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Panel>

      <Panel
        title="Lately"
        description="The last dozen things that happened, across every commission."
        padded={feed.length === 0}
      >
        {feed.length === 0 ? (
          <p style={{ fontSize: 14, color: "var(--text-muted)" }}>Nothing yet.</p>
        ) : (
          <ol style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {feed.map((event) => (
              <li
                key={event.id}
                style={{ display: "flex", gap: 14, padding: "9px 0", borderBottom: "1px solid var(--border-subtle)" }}
              >
                <span style={{ fontSize: 13, color: "var(--text-muted)", minWidth: 150, flexShrink: 0 }}>
                  {fullDate(event.at)}
                </span>
                <span style={{ fontSize: 14 }}>
                  <Link href={`/admin/guides/pipeline/${event.job.id}`}>{event.job.topic}</Link>
                  <span style={META}>
                    {event.note} — {event.actor}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        )}
      </Panel>
    </>
  );
}
