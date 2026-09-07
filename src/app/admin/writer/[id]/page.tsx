import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminHeader, Panel } from "@/components/admin/shell";
import { AcceptDraftForm } from "@/components/admin/AcceptDraftForm";
import { cancelJob, retryJob } from "@/app/actions/admin-writer";
import { StatusPill } from "@/components/ui/primitives";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import type { ResearchBrief } from "@/lib/dataforseo";
import { GUIDE_TYPE_LABELS, guideTypeOf } from "@/lib/enums";
import { guideDraftSchema } from "@/lib/guide-writer";
import { fullDate } from "@/lib/format";
import { parseJson } from "@/lib/json";

export const metadata = { title: "Guide job" };
export const dynamic = "force-dynamic";

const META = { fontSize: 13, color: "var(--text-muted)" } as const;

export default async function GuideJobDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await params;

  const [job, people] = await Promise.all([
    db.guideJob.findUnique({
      where: { id },
      include: {
        template: { select: { id: true, name: true } },
        category: { select: { serviceName: true } },
        city: { select: { name: true } },
        region: { select: { name: true } },
        country: { select: { name: true } },
        guide: { select: { id: true, slug: true, title: true, status: true } },
      },
    }),
    db.person.findMany({ where: { published: true }, orderBy: { name: "asc" }, select: { id: true, name: true, isReviewer: true } }),
  ]);
  if (!job) notFound();

  const research = parseJson<ResearchBrief | null>(job.research, null);
  const parsed = guideDraftSchema.safeParse(parseJson<unknown>(job.draft, null));
  const draft = parsed.success ? parsed.data : null;
  const scope = [job.category?.serviceName, job.city?.name ?? job.region?.name ?? job.country?.name]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <AdminHeader
        title={job.topic}
        description={`${GUIDE_TYPE_LABELS[guideTypeOf(job.guideType)]} · ${scope || "National"} · ${job.template?.name ?? "default template"} · created ${fullDate(job.createdAt)}`}
        actions={
          <>
            <Link href="/admin/writer" className="btn btn--secondary btn--sm">
              All jobs
            </Link>
            {job.status === "FAILED" || job.status === "READY" ? (
              <form action={retryJob}>
                <input type="hidden" name="id" value={job.id} />
                <button type="submit" className="btn btn--secondary btn--sm">
                  Write it again
                </button>
              </form>
            ) : null}
            {["QUEUED", "RESEARCHING", "WRITING"].includes(job.status) ? (
              <form action={cancelJob}>
                <input type="hidden" name="id" value={job.id} />
                <button type="submit" className="btn btn--secondary btn--sm">
                  Cancel
                </button>
              </form>
            ) : null}
          </>
        }
      />

      <Panel title="Status">
        <p style={{ marginBottom: 10 }}>
          <StatusPill status={job.status} />
        </p>
        {job.error ? (
          <>
            <p className="form-error">{job.error}</p>
            {job.hint ? <p style={META}>{job.hint}</p> : null}
          </>
        ) : null}
        {job.guide ? (
          <p>
            Accepted as{" "}
            <Link href={`/admin/guides/${job.guide.id}`}>{job.guide.title}</Link> ({job.guide.status.toLowerCase()}).
          </p>
        ) : null}
        {job.brief ? (
          <>
            <h3 style={{ fontSize: 14, marginTop: 16, marginBottom: 6 }}>Brief for this one</h3>
            <p style={{ whiteSpace: "pre-wrap" }}>{job.brief}</p>
          </>
        ) : null}
      </Panel>

      {research ? (
        <Panel
          title="What the search results say"
          description={`${research.note} ${research.calls > 0 ? `${research.calls} billable calls.` : ""}`}
        >
          <p style={{ marginBottom: 14 }}>
            <strong>{research.keyword}</strong>
            {research.volume !== null ? ` · ${research.volume.toLocaleString()} searches a month` : ""}
            {research.difficulty !== null ? ` · difficulty ${research.difficulty}/100` : ""}
            {research.location ? ` · ${research.location}` : ""}
          </p>

          {research.questions.length > 0 ? (
            <>
              <h3 style={{ fontSize: 14, marginBottom: 6 }}>Questions Google shows</h3>
              <ul style={{ marginBottom: 16 }}>
                {research.questions.map((question) => (
                  <li key={question}>{question}</li>
                ))}
              </ul>
            </>
          ) : null}

          {research.serp.length > 0 ? (
            <>
              <h3 style={{ fontSize: 14, marginBottom: 6 }}>What currently ranks</h3>
              <ol style={{ marginBottom: 16 }}>
                {research.serp.map((result) => (
                  <li key={result.url} style={{ marginBottom: 4 }}>
                    <a href={result.url} target="_blank" rel="noreferrer noopener">
                      {result.title}
                    </a>{" "}
                    <span style={META}>{result.domain}</span>
                  </li>
                ))}
              </ol>
            </>
          ) : null}

          {research.related.length > 0 ? (
            <>
              <h3 style={{ fontSize: 14, marginBottom: 6 }}>Related phrases</h3>
              <p style={META}>
                {research.related
                  .slice(0, 18)
                  .map((idea) => `${idea.keyword}${idea.volume ? ` (${idea.volume.toLocaleString()})` : ""}`)
                  .join(" · ")}
              </p>
            </>
          ) : null}
        </Panel>
      ) : null}

      {draft ? (
        <>
          <Panel
            title="The draft"
            description={`${draft.readingMinutes} min · ${draft.body.length} blocks · ${draft.faqs.length} FAQs · ${draft.sources.length} sources`}
          >
            <h3 style={{ fontSize: 20, marginBottom: 4 }}>{draft.title}</h3>
            <p style={{ ...META, marginBottom: 14 }}>
              /guides/{draft.slug}/ · focus: {draft.focusKeyword}
            </p>

            <h4 style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
              Short answer
            </h4>
            <p style={{ marginBottom: 16 }}>{draft.shortAnswer}</p>

            <h4 style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
              Takeaways
            </h4>
            <ul style={{ marginBottom: 16 }}>
              {draft.keyTakeaways.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>

            <h4 style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
              Body
            </h4>
            <div style={{ marginBottom: 16 }}>
              {draft.body.map((block, index) => {
                if (block.kind === "heading") {
                  return (
                    <h5 key={index} style={{ fontSize: 16, fontWeight: 700, margin: "16px 0 6px" }}>
                      {block.text}
                    </h5>
                  );
                }
                if (block.kind === "paragraph") {
                  return (
                    <p key={index} style={{ marginBottom: 8 }}>
                      {block.text}
                    </p>
                  );
                }
                return (
                  <p key={index} style={{ ...META, marginBottom: 8 }}>
                    [{block.kind}]{" "}
                    {"title" in block && block.title
                      ? block.title
                      : "items" in block
                        ? `${block.items.length} items`
                        : ""}
                  </p>
                );
              })}
            </div>

            <h4 style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
              Bottom line
            </h4>
            <p style={{ marginBottom: 16 }}>{draft.bottomLine}</p>

            {draft.sources.length > 0 ? (
              <>
                <h4 style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
                  Sources
                </h4>
                <ul style={{ marginBottom: 16 }}>
                  {draft.sources.map((source) => (
                    <li key={source.url}>
                      <a href={source.url} target="_blank" rel="noreferrer noopener">
                        {source.label}
                      </a>{" "}
                      <span style={META}>{source.tier.toLowerCase()}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p style={{ ...META, marginBottom: 16 }}>
                No sources. Correct when the research had nothing citable, and worth checking before
                this goes live.
              </p>
            )}

            <h4 style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
              What the writer was unsure about
            </h4>
            <p style={{ whiteSpace: "pre-wrap" }}>{draft.confidence}</p>
          </Panel>

          {job.status === "READY" ? (
            <Panel
              title="Accept it"
              description="Creates the guide in Draft status, with the FAQs, sources and SEO record attached. Nothing goes live until you publish it yourself."
            >
              <AcceptDraftForm
                jobId={job.id}
                people={people.map((person) => ({
                  id: person.id,
                  label: person.name,
                  isReviewer: person.isReviewer,
                }))}
              />
            </Panel>
          ) : null}
        </>
      ) : null}
    </>
  );
}
