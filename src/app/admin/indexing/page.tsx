import { AdminHeader, EmptyState, Panel, StatRow } from "@/components/admin/shell";
import { clearFailedIndexing, flushIndexing, queueEverything } from "@/app/actions/admin-writer";
import { StatusPill } from "@/components/ui/primitives";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { DAILY_QUOTA, googleIndexingConfigured, sentToday } from "@/lib/google-indexing";
import { indexNowKey, indexNowKeyLocation } from "@/lib/indexnow";
import { fullDate } from "@/lib/format";

export const metadata = { title: "Indexing" };
export const dynamic = "force-dynamic";

export default async function IndexingConsole() {
  await requireStaff();

  const [configured, today, queued, failed, recent, key] = await Promise.all([
    googleIndexingConfigured(),
    sentToday(),
    db.indexRequest.count({ where: { target: "GOOGLE", status: "QUEUED" } }),
    db.indexRequest.count({ where: { target: "GOOGLE", status: "FAILED" } }),
    db.indexRequest.findMany({ orderBy: { updatedAt: "desc" }, take: 40 }),
    indexNowKey().catch(() => null),
  ]);

  return (
    <>
      <AdminHeader
        title="Indexing"
        description="What has been pushed to the search engines, and what is waiting. The sitemap is still the mechanism; these are the nudges on top of it."
        actions={
          <>
            <form action={queueEverything}>
              <button type="submit" className="btn btn--secondary btn--sm">
                Queue everything in the sitemap
              </button>
            </form>
            <form action={flushIndexing}>
              <button type="submit" className="btn btn--primary btn--sm">
                Send now
              </button>
            </form>
          </>
        }
      />

      <StatRow
        compact
        stats={[
          { label: "Sent today", value: `${today} / ${DAILY_QUOTA}` },
          { label: "Queued", value: queued },
          { label: "Failed", value: failed },
          { label: "Google API", value: configured ? "Connected" : "Not set up" },
        ]}
      />

      {!configured ? (
        <Panel title="Connect the Google Indexing API">
          <ol style={{ paddingLeft: 20, lineHeight: 1.8 }}>
            <li>Create a service account in Google Cloud and enable the Indexing API on the project.</li>
            <li>Download its JSON key.</li>
            <li>
              In Search Console, add the service account&rsquo;s email address as an <strong>Owner</strong> of
              the property. Anything less and every call is rejected.
            </li>
            <li>Paste the whole JSON file into the Google service account field under Integrations.</li>
          </ol>
          <p style={{ marginTop: 14, fontSize: 14, color: "var(--text-secondary)" }}>
            Worth knowing before you rely on it: Google documents this API for job postings and live
            video, and says everything else should be found through the sitemap. It usually accepts
            other URLs and often acts on them, but it is outside the documented contract, so treat it
            as a bonus rather than the plan.
          </p>
        </Panel>
      ) : null}

      <Panel
        title="IndexNow"
        description="Bing, Yandex and Naver. Sent the moment a page is published, and it needs no account."
      >
        {key ? (
          <p style={{ fontSize: 14 }}>
            Key file: <code>{indexNowKeyLocation(key)}</code>
          </p>
        ) : (
          <p style={{ fontSize: 14 }}>The key is generated on the first submission.</p>
        )}
      </Panel>

      <Panel
        title="Recent submissions"
        padded={false}
        actions={
          failed > 0 ? (
            <form action={clearFailedIndexing}>
              <button type="submit" className="btn btn--secondary btn--sm">
                Clear {failed} failed
              </button>
            </form>
          ) : null
        }
      >
        {recent.length === 0 ? (
          <div style={{ padding: 24 }}>
            <EmptyState
              title="Nothing submitted yet"
              body="Publishing a page queues it automatically. Use the button above to queue everything the sitemap already offers."
            />
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>URL</th>
                <th>Status</th>
                <th>Tries</th>
                <th>When</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((row) => (
                <tr key={row.id}>
                  <td style={{ maxWidth: 380, overflow: "hidden", textOverflow: "ellipsis" }}>{row.url}</td>
                  <td>
                    <StatusPill status={row.status} />
                  </td>
                  <td>{row.attempts}</td>
                  <td>{fullDate(row.sentAt ?? row.updatedAt)}</td>
                  <td style={{ fontSize: 12, color: "var(--text-muted)", maxWidth: 280 }}>
                    {row.error ?? (row.status === "SENT" ? "Accepted" : "")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </>
  );
}
