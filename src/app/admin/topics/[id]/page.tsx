import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminHeader, EmptyState, Panel, StatRow } from "@/components/admin/shell";
import { TopicIdeaActions } from "@/components/admin/TopicIdeaActions";
import { cancelPlan, deletePlan, dismissTopic, restoreTopic, retryPlan, snoozeTopic } from "@/app/actions/admin-topics";
import { StatusPill } from "@/components/ui/primitives";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { GUIDE_TYPE_LABELS, guideTypeOf } from "@/lib/enums";
import { fullDate } from "@/lib/format";
import { parseJson, parseList } from "@/lib/json";

export const metadata = { title: "Topic plan" };
export const dynamic = "force-dynamic";

const META = { fontSize: 12, color: "var(--text-muted)" } as const;

type Reason = { label: string; detail: string; delta: number };
type Evidence = { questions: string[]; topDomains: string[]; features: string[] };

export default async function TopicPlanDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await params;

  const plan = await db.topicPlan.findUnique({
    where: { id },
    include: {
      ideas: {
        orderBy: [{ status: "asc" }, { rank: "asc" }],
        include: {
          category: { select: { serviceName: true } },
          city: { select: { name: true } },
          region: { select: { name: true } },
          country: { select: { name: true } },
        },
      },
    },
  });
  if (!plan) notFound();

  const running = ["QUEUED", "PRICING", "PROBING", "DRAFTING"].includes(plan.status);
  const open = plan.ideas.filter((idea) => idea.status === "SUGGESTED");
  const settled = plan.ideas.filter((idea) => idea.status !== "SUGGESTED");

  return (
    <>
      <AdminHeader
        title={`Week of ${plan.weekOf.toISOString().slice(0, 10)}`}
        description={`${plan.trigger === "AUTO" ? "Opened on schedule" : "Started by hand"} · asked for ${plan.target} · created ${fullDate(plan.createdAt)}`}
        actions={
          <>
            <Link href="/admin/topics" className="btn btn--secondary btn--sm">
              All plans
            </Link>
            {plan.status === "FAILED" || plan.status === "READY" ? (
              <form action={retryPlan}>
                <input type="hidden" name="id" value={plan.id} />
                <button type="submit" className="btn btn--secondary btn--sm">
                  Run it again
                </button>
              </form>
            ) : null}
            {running ? (
              <form action={cancelPlan}>
                <input type="hidden" name="id" value={plan.id} />
                <button type="submit" className="btn btn--secondary btn--sm">
                  Stop
                </button>
              </form>
            ) : null}
          </>
        }
      />

      <StatRow
        compact
        stats={[
          { label: "Candidates", value: plan.candidates.toLocaleString() },
          { label: "Priced this run", value: plan.priced.toLocaleString() },
          { label: "Already known", value: plan.cachedHits.toLocaleString() },
          { label: "Billable calls", value: plan.calls },
        ]}
      />

      <Panel title="Status">
        <p style={{ marginBottom: 10 }}>
          <StatusPill status={plan.status} />
          {running ? (
            <span style={{ ...META, marginLeft: 10 }}>
              The worker moves this on every few seconds. Reload to follow it.
            </span>
          ) : null}
        </p>
        {plan.error ? (
          <>
            <p className="form-error">{plan.error}</p>
            {plan.hint ? <p style={META}>{plan.hint}</p> : null}
          </>
        ) : null}
        {plan.notes ? (
          <ul style={{ marginTop: 12, paddingLeft: 18, lineHeight: 1.7 }}>
            {plan.notes.split("\n").map((line) => (
              <li key={line} style={{ fontSize: 13 }}>
                {line}
              </li>
            ))}
          </ul>
        ) : null}
      </Panel>

      {open.length > 0 ? (
        <Panel
          title="This week"
          description="Write it commissions a guide job with the angle and the outline already in its brief. Not now hides it for three months. Never keeps it off every later week."
          padded={false}
        >
          <div style={{ display: "grid", gap: 0 }}>
            {open.map((idea) => (
              <IdeaCard
                key={idea.id}
                idea={idea}
                dismiss={dismissTopic}
                snooze={snoozeTopic}
                restore={restoreTopic}
              />
            ))}
          </div>
        </Panel>
      ) : (
        <Panel title="This week">
          <EmptyState
            title={running ? "Still working" : "Nothing suggested"}
            body={
              running
                ? "The plan is still pricing or looking at search results. This fills in when it finishes."
                : "Either everything was already covered or nothing cleared the gates. The notes above say which."
            }
          />
        </Panel>
      )}

      {settled.length > 0 ? (
        <Panel title="Decided" padded={false}>
          <table className="table">
            <thead>
              <tr>
                <th>Topic</th>
                <th>Phrase</th>
                <th>What you said</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {settled.map((idea) => (
                <tr key={idea.id}>
                  <td>{idea.topic}</td>
                  <td style={META}>{idea.keyword}</td>
                  <td>
                    <StatusPill status={idea.status} />
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <TopicIdeaActions
                      id={idea.id}
                      status={idea.status}
                      jobId={idea.jobId}
                      dismiss={dismissTopic}
                      snooze={snoozeTopic}
                      restore={restoreTopic}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      ) : null}

      {!running ? (
        <form action={deletePlan} style={{ marginTop: 26 }}>
          <input type="hidden" name="id" value={plan.id} />
          <button type="submit" className="btn btn--danger btn--sm">
            Delete this plan
          </button>
        </form>
      ) : null}
    </>
  );
}

type IdeaRow = {
  id: string;
  rank: number;
  status: string;
  jobId: string | null;
  topic: string;
  keyword: string;
  angle: string | null;
  outline: string | null;
  guideType: string;
  volume: number | null;
  aiVolume: number | null;
  difficulty: number | null;
  intent: string | null;
  ourRank: number | null;
  score: number;
  reasons: string | null;
  evidence: string | null;
  category: { serviceName: string } | null;
  city: { name: string } | null;
  region: { name: string } | null;
  country: { name: string } | null;
};

function IdeaCard({
  idea,
  dismiss,
  snooze,
  restore,
}: {
  idea: IdeaRow;
  dismiss: (formData: FormData) => Promise<void>;
  snooze: (formData: FormData) => Promise<void>;
  restore: (formData: FormData) => Promise<void>;
}) {
  const reasons = parseJson<Reason[]>(idea.reasons, []);
  const evidence = parseJson<Evidence>(idea.evidence, { questions: [], topDomains: [], features: [] });
  const outline = parseList(idea.outline);
  const scope = [idea.category?.serviceName, idea.city?.name ?? idea.region?.name ?? idea.country?.name]
    .filter(Boolean)
    .join(" · ");

  const facts = [
    idea.volume !== null ? `${idea.volume.toLocaleString()} searches a month` : "volume unknown",
    idea.difficulty !== null ? `difficulty ${idea.difficulty}` : null,
    idea.intent,
    idea.aiVolume ? `${idea.aiVolume.toLocaleString()} AI searches` : null,
    idea.ourRank !== null ? `we sit at ${idea.ourRank}` : null,
  ].filter(Boolean);

  return (
    <article style={{ padding: "20px 24px", borderTop: "1px solid var(--border)" }}>
      <div style={{ display: "flex", gap: 16, alignItems: "flex-start", justifyContent: "space-between" }}>
        <div style={{ minWidth: 0 }}>
          <p style={META}>
            {idea.rank}. {GUIDE_TYPE_LABELS[guideTypeOf(idea.guideType)]}
            {scope ? ` · ${scope}` : ""}
          </p>
          <h3 style={{ fontSize: 18, margin: "2px 0 6px" }}>{idea.topic}</h3>
          <p style={META}>
            Target phrase: <strong>{idea.keyword}</strong> · {facts.join(" · ")}
          </p>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontSize: 26, fontWeight: 700, lineHeight: 1 }}>{idea.score}</div>
          <div style={META}>out of 100</div>
        </div>
      </div>

      {idea.angle ? (
        <p style={{ marginTop: 12, whiteSpace: "pre-wrap", maxWidth: "76ch" }}>{idea.angle}</p>
      ) : null}

      {outline.length > 0 ? (
        <>
          <h4 style={{ ...META, textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 14 }}>
            It has to cover
          </h4>
          <ul style={{ paddingLeft: 18, marginTop: 4 }}>
            {outline.map((line) => (
              <li key={line} style={{ fontSize: 14 }}>
                {line}
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {reasons.length > 0 ? (
        <details style={{ marginTop: 14 }}>
          <summary style={{ ...META, cursor: "pointer" }}>Why it scored what it scored</summary>
          <ul style={{ paddingLeft: 18, marginTop: 8 }}>
            {reasons.map((reason) => (
              <li key={reason.label} style={{ fontSize: 13, marginBottom: 3 }}>
                <strong>
                  {reason.delta > 0 ? "+" : ""}
                  {reason.delta}
                </strong>{" "}
                {reason.label}: {reason.detail}
              </li>
            ))}
          </ul>
          {evidence.topDomains.length > 0 ? (
            <p style={{ ...META, marginTop: 10 }}>
              Currently ranking: {evidence.topDomains.slice(0, 8).join(", ")}
            </p>
          ) : null}
          {evidence.questions.length > 0 ? (
            <p style={{ ...META, marginTop: 6 }}>
              Questions Google shows: {evidence.questions.slice(0, 8).join(" · ")}
            </p>
          ) : null}
        </details>
      ) : null}

      <div style={{ marginTop: 16 }}>
        <TopicIdeaActions
          id={idea.id}
          status={idea.status}
          jobId={idea.jobId}
          dismiss={dismiss}
          snooze={snooze}
          restore={restore}
        />
      </div>
    </article>
  );
}
