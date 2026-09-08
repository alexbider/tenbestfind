import Link from "next/link";
import { AdminHeader, EmptyState, Panel, StatRow } from "@/components/admin/shell";
import { TopicSettingsForm } from "@/components/admin/TopicSettingsForm";
import { planThisWeek } from "@/app/actions/admin-topics";
import { StatusPill } from "@/components/ui/primitives";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { researchConfigured } from "@/lib/dataforseo";
import { fullDate } from "@/lib/format";
import { parseJson } from "@/lib/json";
import { TOPIC_FIELDS } from "@/lib/topic-fields";
import { loadTopicSettings, weekStart } from "@/lib/topic-settings";

export const metadata = { title: "Topic radar" };
export const dynamic = "force-dynamic";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default async function TopicsConsole() {
  await requireStaff();

  const [settings, stored, plans, services, openIdeas, researchReady, priced] = await Promise.all([
    loadTopicSettings(),
    db.setting.findMany({ where: { key: { startsWith: "topics." } } }),
    db.topicPlan.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { _count: { select: { ideas: true } } },
    }),
    db.category.findMany({
      where: { published: true },
      orderBy: { sortOrder: "asc" },
      select: { slug: true, name: true },
    }),
    db.topicIdea.count({ where: { status: "SUGGESTED" } }),
    researchConfigured(),
    db.keywordMetric.count(),
  ]);

  // The saved values layered over the defaults, so an unsaved dial still shows
  // what it is actually doing rather than an empty box.
  const values: Record<string, unknown> = {};
  const savedByKey = new Map(stored.map((row) => [row.key, parseJson<unknown>(row.value, undefined)]));
  for (const field of TOPIC_FIELDS) {
    values[field.key] = savedByKey.get(field.key) ?? field.default;
  }

  const thisWeek = weekStart();
  const current = plans.find((plan) => plan.weekOf.getTime() === thisWeek.getTime());

  return (
    <>
      <AdminHeader
        title="Topic radar"
        description="Once a week it prices every trade against every place, keeps what clears the gates, looks closely at the best of it, and comes back with what to write. It suggests; you decide."
        actions={
          <form action={planThisWeek}>
            <button type="submit" className="btn btn--primary btn--sm">
              {current ? "Plan again now" : "Plan this week now"}
            </button>
          </form>
        }
      />

      <StatRow
        compact
        stats={[
          { label: "Waiting on you", value: openIdeas },
          { label: "Phrases priced", value: priced.toLocaleString() },
          { label: "Automatic", value: settings.enabled ? `Every ${DAYS[settings.dayOfWeek]}` : "Off" },
          { label: "DataForSEO", value: researchReady ? "Connected" : "Not set up" },
        ]}
      />

      {!researchReady ? (
        <Panel title="Connect DataForSEO first">
          <p>
            Without it a plan has no volumes, no difficulty and no search results to look at, which is
            everything it decides on. Paste the login and password under{" "}
            <Link href="/admin/integrations">Integrations</Link> and run one week to see what comes back
            before turning the schedule on.
          </p>
        </Panel>
      ) : null}

      <Panel title="Plans" padded={false}>
        {plans.length === 0 ? (
          <div style={{ padding: 24 }}>
            <EmptyState
              title="Nothing planned yet"
              body="Press the button above. The first run prices a slice of the matrix and takes a few minutes; every run after it is faster and cheaper because the prices are kept."
            />
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Week of</th>
                <th>Status</th>
                <th>Ideas</th>
                <th>Candidates</th>
                <th>Priced</th>
                <th>Calls</th>
                <th>Started</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((plan) => (
                <tr key={plan.id}>
                  <td>
                    <Link href={`/admin/guides/topics/${plan.id}`}>{plan.weekOf.toISOString().slice(0, 10)}</Link>
                    <span style={{ display: "block", fontSize: 12, color: "var(--text-muted)" }}>
                      {plan.trigger === "AUTO" ? "on schedule" : "by hand"}
                    </span>
                  </td>
                  <td>
                    <StatusPill status={plan.status} />
                  </td>
                  <td>{plan._count.ideas}</td>
                  <td>{plan.candidates.toLocaleString()}</td>
                  <td>{plan.priced.toLocaleString()}</td>
                  <td>{plan.calls}</td>
                  <td>{plan.startedAt ? fullDate(plan.startedAt) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>

      <Panel
        title="How it decides"
        description="These change what the next run looks at and what it is allowed to spend. An open plan keeps the settings it started under."
      >
        <TopicSettingsForm
          values={values}
          services={services.map((service) => ({ slug: service.slug, label: service.name }))}
        />
      </Panel>
    </>
  );
}
