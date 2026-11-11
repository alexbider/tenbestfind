import Link from "next/link";
import { openOwnBillingPortal, startOwnCheckout } from "@/app/actions/portal";
import { AdminHeader, EmptyState, Panel } from "@/components/admin/shell";
import { StatusPill } from "@/components/ui/primitives";
import { requireOwner } from "@/lib/auth";
import { db } from "@/lib/db";
import { fullDate, money } from "@/lib/format";
import { billingOptions, resolvePortalBusiness } from "@/lib/portal";
import { routes } from "@/lib/urls";

export const metadata = { title: "Billing" };

type Props = { searchParams: Promise<{ businessId?: string; notice?: string; session?: string }> };

const NOTICES: Record<string, { tone: "error" | "ok"; text: string }> = {
  "no-customer": {
    tone: "error",
    text: "There is no card on file for this company yet, so there is nothing to manage. Start a plan below.",
  },
  "portal-error": { tone: "error", text: "We could not open the billing portal just now. Please try again in a minute." },
  "checkout-error": {
    tone: "error",
    text: "We could not open the secure checkout just now. Nothing was charged. Please try again in a minute.",
  },
  unavailable: { tone: "error", text: "That option is not available for this company right now." },
  recorded: { tone: "ok", text: "Request received. Our team will be in touch to finish setting up the plan." },
};

const notice = (tone: "error" | "ok") => ({
  marginBottom: 24,
  padding: "12px 14px",
  borderRadius: 12,
  fontSize: 14,
  lineHeight: 1.55,
  background: tone === "error" ? "#FDF1EE" : "var(--blue-50)",
  border: `1px solid ${tone === "error" ? "#F3C6BB" : "var(--blue-100)"}`,
  color: tone === "error" ? "var(--maple-600)" : "var(--ink)",
});

function intervalLabel(interval: string) {
  return interval === "year" ? "yr" : interval === "month" ? "mo" : interval;
}

export default async function PortalBilling({ searchParams }: Props) {
  const user = await requireOwner();
  const params = await searchParams;
  const { business } = await resolvePortalBusiness(user, params.businessId);

  if (!business) {
    return (
      <>
        <AdminHeader title="Billing" />
        <Panel>
          <EmptyState
            title="No listing is attached to this account yet"
            body="Once a claim is approved, its plan and invoices appear here."
          />
        </Panel>
      </>
    );
  }

  const [record, subscriptions, invoices, options] = await Promise.all([
    db.business.findUnique({ where: { id: business.id }, select: { stripeCustomerId: true } }),
    // An unfinished checkout leaves a PENDING row; it was never a plan, so it is not shown.
    db.subscription.findMany({
      where: { businessId: business.id, status: { not: "PENDING" } },
      orderBy: { createdAt: "desc" },
      include: { plan: { select: { name: true, priceCents: true, currency: true, interval: true } } },
    }),
    db.invoice.findMany({
      where: { subscription: { businessId: business.id } },
      orderBy: { issuedAt: "desc" },
      take: 50,
      include: { subscription: { select: { plan: { select: { name: true } } } } },
    }),
    billingOptions(business.id),
  ]);

  const shown = params.session
    ? { tone: "ok" as const, text: "Thanks, your payment went through. It can take a minute for the plan to show here." }
    : params.notice
      ? NOTICES[params.notice]
      : undefined;

  return (
    <>
      <AdminHeader
        title="Billing"
        description={`Plans and invoices for ${business.name}.`}
        actions={
          <>
            <Link href="/portal/account" className="btn btn--secondary btn--sm">
              Account and password
            </Link>
            {record?.stripeCustomerId ? (
              <form action={openOwnBillingPortal}>
                <input type="hidden" name="businessId" value={business.id} />
                <button type="submit" className="btn btn--primary btn--sm">
                  Update card or cancel
                </button>
              </form>
            ) : null}
          </>
        }
      />

      {shown ? (
        <p role={shown.tone === "error" ? "alert" : "status"} style={notice(shown.tone)}>
          {shown.text}
        </p>
      ) : null}

      <Panel
        title="Your plans"
        description="Cancelling keeps the plan until the end of the period you have paid for."
        padded={subscriptions.length === 0}
      >
        {subscriptions.length === 0 ? (
          <>
            <EmptyState
              title="No plan yet"
              body="A plan opens the contact details on every enquiry and lets you manage your profile."
            />
            <p style={{ marginTop: 18 }}>
              <Link href={routes.forBusinesses()} className="btn btn--primary btn--sm">
                See the plans
              </Link>
            </p>
          </>
        ) : (
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th scope="col">Plan</th>
                  <th scope="col">Status</th>
                  <th scope="col">Price</th>
                  <th scope="col">Started</th>
                  <th scope="col">Renews or ends</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.map((row) => {
                  const live = row.status === "ACTIVE" || row.status === "PAST_DUE";
                  let ends = "—";
                  if (row.status === "CANCELED") ends = `Ended ${fullDate(row.canceledAt ?? row.currentPeriodEnd)}`;
                  else if (live && row.cancelAtPeriodEnd) ends = `Ends ${fullDate(row.currentPeriodEnd)}`;
                  else if (live && row.currentPeriodEnd) ends = `Renews ${fullDate(row.currentPeriodEnd)}`;
                  return (
                    <tr key={row.id}>
                      <td className="admin-table__primary">{row.plan.name}</td>
                      <td>
                        <StatusPill status={row.status} />
                        {live && row.cancelAtPeriodEnd ? (
                          <span className="admin-table__meta">Cancellation scheduled</span>
                        ) : null}
                      </td>
                      <td>
                        {money(row.plan.priceCents * row.quantity, row.plan.currency)}/{intervalLabel(row.plan.interval)}
                      </td>
                      <td>{row.startedAt ? fullDate(row.startedAt) : "—"}</td>
                      <td>{ends}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {options.restart || options.top10 ? (
        <Panel title={options.restart ? "Restart your plan" : "Add Top 10 placement"}>
          {options.restart ? (
            <>
              <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 16 }}>
                Your {options.restart.planName} plan has ended. Restarting opens the contact details on your
                enquiries again, including the ones held while the plan was off.
              </p>
              <form action={startOwnCheckout}>
                <input type="hidden" name="businessId" value={business.id} />
                <input type="hidden" name="kind" value="restart" />
                <button type="submit" className="btn btn--primary btn--sm">
                  Restart {options.restart.planName}
                </button>
              </form>
            </>
          ) : options.top10 && "unavailable" in options.top10 ? (
            <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6 }}>
              {options.top10.unavailable}
            </p>
          ) : (
            <>
              <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 16 }}>
                Show your company as the Featured Partner on the Top 10 list for your city and trade. It is
                labelled Sponsored and never changes your editorial ranking. Billed separately, and you can
                cancel it on its own.
              </p>
              <form action={startOwnCheckout}>
                <input type="hidden" name="businessId" value={business.id} />
                <input type="hidden" name="kind" value="top10" />
                <button type="submit" className="btn btn--primary btn--sm">
                  Add Top 10
                </button>
              </form>
            </>
          )}
        </Panel>
      ) : null}

      <Panel title="Invoices" description="Receipts come from 2M, LLC, which bills for TenBestFind." padded={invoices.length === 0}>
        {invoices.length === 0 ? (
          <EmptyState title="No invoices yet" body="Each charge appears here with a link to the receipt." />
        ) : (
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th scope="col">Number</th>
                  <th scope="col">Date</th>
                  <th scope="col">Amount</th>
                  <th scope="col">Status</th>
                  <th scope="col">
                    <span className="sr-only">Links</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td>
                      <span className="admin-table__primary">{invoice.number}</span>
                      <span className="admin-table__meta">{invoice.subscription.plan.name}</span>
                    </td>
                    <td>{fullDate(invoice.issuedAt)}</td>
                    <td>{money(invoice.amountCents, invoice.currency)}</td>
                    <td>
                      <StatusPill status={invoice.status} />
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      {invoice.hostedUrl ? (
                        <a href={invoice.hostedUrl} target="_blank" rel="noopener noreferrer">
                          View
                        </a>
                      ) : null}
                      {invoice.hostedUrl && invoice.pdfUrl ? " · " : null}
                      {invoice.pdfUrl ? (
                        <a href={invoice.pdfUrl} target="_blank" rel="noopener noreferrer">
                          PDF
                        </a>
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
  );
}
