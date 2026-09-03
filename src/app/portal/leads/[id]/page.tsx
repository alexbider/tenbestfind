import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminHeader, Panel } from "@/components/admin/shell";
import { StatusPill } from "@/components/ui/primitives";
import { markLeadRead, saveOwnLeadNote, setOwnLeadStatus } from "@/app/actions/portal";
import { fullDate } from "@/lib/format";
import { requireOwner } from "@/lib/auth";
import { leadAccessFor, maskLead, firstNameOf } from "@/lib/entitlements";
import { LEAD_STATUSES, URGENCY_LABEL } from "@/lib/leads";
import { routes } from "@/lib/urls";
import { db } from "@/lib/db";

export const metadata = { title: "Lead" };

type Props = { params: Promise<{ id: string }> };

export default async function PortalLeadDetail({ params }: Props) {
  const user = await requireOwner();
  const { id } = await params;

  const lead = await db.lead.findUnique({
    where: { id },
    include: { business: { select: { id: true, name: true, ownerId: true } } },
  });
  const staff = user.role === "ADMIN" || user.role === "EDITOR";
  if (!lead || (!staff && lead.business.ownerId !== user.id)) notFound();

  // Opening it counts as reading it, which is what moves a new lead along.
  await markLeadRead(lead.id);

  const access = await leadAccessFor(lead.businessId);
  const view = maskLead(lead, access.unlocked);
  const displayName = access.unlocked ? lead.name : `${firstNameOf(lead.name)} ${"•".repeat(6)}`;

  return (
    <>
      <AdminHeader
        title={displayName}
        description={`Asked for a quote on ${fullDate(lead.createdAt)}.`}
        actions={
          <Link href="/portal/leads" className="btn btn--secondary btn--sm">
            Back to leads
          </Link>
        }
      />

      <div className="panel-grid panel-grid--wide">
        <Panel title="The enquiry">
          <dl className="transparency__grid" style={{ background: "none", padding: 0 }}>
            <div>
              <dt>What they need</dt>
              <dd>{lead.jobType || "They did not name a service"}</dd>
            </div>
            <div>
              <dt>How soon</dt>
              <dd>{URGENCY_LABEL[lead.urgency] ?? lead.urgency}</dd>
            </div>
            <div>
              <dt>Where</dt>
              <dd>{view.postalCode ?? "Not given"}</dd>
            </div>
            <div>
              <dt>Found you on</dt>
              <dd>{lead.path ?? "Your profile"}</dd>
            </div>
          </dl>

          <h3 style={{ marginTop: 26, marginBottom: 10, fontSize: 15, fontWeight: 650 }}>
            What they wrote
          </h3>
          {view.masked ? (
            <div className="lead-locked">
              <p>
                The message is held for you in full. It opens along with the phone number and the
                email address as soon as the listing is on a plan.
              </p>
              <Link href={routes.forBusinesses()} className="btn btn--primary btn--sm">
                See the plans
              </Link>
            </div>
          ) : (
            <p style={{ fontSize: 15, lineHeight: 1.7, color: "var(--text-secondary)", whiteSpace: "pre-wrap" }}>
              {lead.message}
            </p>
          )}
        </Panel>

        <div>
          <Panel title="How to reach them">
            {view.masked ? (
              <div className="lead-locked">
                <p style={{ marginBottom: 4 }}>
                  Email <span className="lead-locked__value">{view.email}</span>
                </p>
                {lead.phone ? (
                  <p style={{ marginBottom: 14 }}>
                    Phone <span className="lead-locked__value">{view.phone}</span>
                  </p>
                ) : null}
                <p>
                  {access.reason} Nothing here is deleted while you decide, and every earlier
                  enquiry opens at the same time.
                </p>
                <Link href={routes.claim()} className="btn btn--primary btn--sm">
                  {access.claimed ? "Choose a plan" : "Claim this listing"}
                </Link>
              </div>
            ) : (
              <ul style={{ display: "grid", gap: 12, fontSize: 15, listStyle: "none", padding: 0 }}>
                <li>
                  <a href={`mailto:${lead.email}`}>{lead.email}</a>
                </li>
                {lead.phone ? (
                  <li>
                    <a href={`tel:${lead.phone.replace(/[^\d+]/g, "")}`}>{lead.phone}</a>
                  </li>
                ) : null}
              </ul>
            )}
          </Panel>

          <Panel title="Where you are with it">
            <form action={setOwnLeadStatus} style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
              <input type="hidden" name="id" value={lead.id} />
              <label className="field" style={{ margin: 0, flex: 1 }}>
                <span>Status</span>
                <select name="status" defaultValue={lead.status}>
                  {LEAD_STATUSES.filter((value) => value !== "SPAM").map((value) => (
                    <option key={value} value={value}>
                      {value[0] + value.slice(1).toLowerCase()}
                    </option>
                  ))}
                </select>
              </label>
              <button type="submit" className="btn btn--secondary btn--sm">
                Save
              </button>
            </form>

            <div style={{ marginTop: 12 }}>
              <StatusPill status={lead.status} />
            </div>

            <form action={saveOwnLeadNote} style={{ marginTop: 22 }}>
              <input type="hidden" name="id" value={lead.id} />
              <div className="field">
                <label htmlFor="lead-notes">Your notes</label>
                <textarea id="lead-notes" name="notes" rows={4} defaultValue={lead.notes ?? ""} />
                <span className="field__hint">Only you and our support team can read these.</span>
              </div>
              <div className="field">
                <label htmlFor="lead-value">What the job was worth</label>
                <input
                  id="lead-value"
                  name="value"
                  type="number"
                  min={0}
                  step="0.01"
                  defaultValue={lead.valueCents ? (lead.valueCents / 100).toFixed(2) : ""}
                />
                <span className="field__hint">
                  Optional. It is what makes the return on your listing measurable.
                </span>
              </div>
              <button type="submit" className="btn btn--secondary btn--sm">
                Save notes
              </button>
            </form>
          </Panel>
        </div>
      </div>
    </>
  );
}
