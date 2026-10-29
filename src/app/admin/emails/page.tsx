import { AdminHeader, EmptyState, Panel, StatRow } from "@/components/admin/shell";
import { TestEmailForm } from "@/components/admin/TestEmailForm";
import { Badge } from "@/components/ui/primitives";
import { requireAdmin } from "@/lib/auth";
import { mailConfigured, recentEmails, senderAddress } from "@/lib/mail";
import { TEST_TEMPLATES, teamInbox } from "@/lib/notify";

export const metadata = { title: "Email delivery" };
export const dynamic = "force-dynamic";

/** Resend's last event for a message, and how worried to be about it. */
const STATUS: Record<string, { label: string; tone: "neutral" | "positive" | "warning" | "danger"; meaning: string }> = {
  delivered: { label: "Delivered", tone: "positive", meaning: "Accepted by the recipient's mail server." },
  opened: { label: "Opened", tone: "positive", meaning: "Delivered and opened." },
  clicked: { label: "Clicked", tone: "positive", meaning: "Delivered and a link was clicked." },
  sent: { label: "Sent", tone: "neutral", meaning: "Handed off, waiting for the recipient's server." },
  queued: { label: "Queued", tone: "neutral", meaning: "Waiting to go out." },
  scheduled: { label: "Scheduled", tone: "neutral", meaning: "Set to go out later." },
  delivery_delayed: { label: "Delayed", tone: "warning", meaning: "The recipient's server is deferring it. Resend keeps retrying." },
  bounced: { label: "Bounced", tone: "danger", meaning: "Rejected by the recipient's server, usually a mailbox that does not exist." },
  complained: { label: "Marked as spam", tone: "danger", meaning: "The recipient reported it as spam." },
  failed: { label: "Failed", tone: "danger", meaning: "Resend could not send it." },
  canceled: { label: "Canceled", tone: "neutral", meaning: "Canceled before sending." },
  suppressed: { label: "Suppressed", tone: "danger", meaning: "Not sent, because this address bounced or complained before." },
};

export default async function AdminEmailsPage() {
  await requireAdmin();
  const [configured, from, team, log] = await Promise.all([mailConfigured(), senderAddress(), teamInbox(), recentEmails(50)]);

  const count = (statuses: string[]) => log.emails.filter((email) => statuses.includes(email.status)).length;

  return (
    <>
      <AdminHeader
        title="Email delivery"
        description="Every email the site sent through Resend, newest first, with what happened to it after it left. Sent means the site handed it over; Delivered means the recipient's server took it."
      />

      <StatRow
        stats={[
          { label: "Sending from", value: from },
          { label: "Team alerts to", value: team },
          { label: "Delivered (last 50)", value: count(["delivered", "opened", "clicked"]) },
          { label: "Problems (last 50)", value: count(["bounced", "complained", "failed", "suppressed", "delivery_delayed"]), hint: "bounced, spam, failed, suppressed, delayed" },
        ]}
      />

      <Panel title="Send a test email" description="Sends one template filled with sample data, so you can see the design in a real inbox.">
        {configured ? (
          <TestEmailForm templates={Object.entries(TEST_TEMPLATES)} defaultTo={team} />
        ) : (
          <EmptyState title="Resend is not set up" body="Add the Resend API key under Integrations first." />
        )}
      </Panel>

      <Panel title="Recent emails" description="Status comes from Resend and updates as the recipient's server answers.">
        {log.error ? (
          <EmptyState title="Could not load the delivery log" body={log.error} />
        ) : log.emails.length === 0 ? (
          <EmptyState title="Nothing sent yet" body="Emails appear here as soon as the site sends one." />
        ) : (
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Sent</th>
                  <th>To</th>
                  <th>Subject</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {log.emails.map((email) => {
                  const status = STATUS[email.status] ?? { label: email.status, tone: "neutral" as const, meaning: "" };
                  return (
                    <tr key={email.id}>
                      <td className="admin-table__meta">
                        {when(email.createdAt)}
                      </td>
                      <td>{email.to.join(", ")}</td>
                      <td className="admin-table__primary">{email.subject}</td>
                      <td title={status.meaning}>
                        <Badge tone={status.tone}>{status.label}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}

/** Resend writes "2026-10-28 18:28:00.123+00"; normalise it before parsing. */
function when(raw: string): string {
  const iso = raw.replace(" ", "T").replace(/([+-]\d{2})$/, "$1:00");
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleString("en-CA", { timeZone: "America/Toronto", dateStyle: "medium", timeStyle: "short" });
}
