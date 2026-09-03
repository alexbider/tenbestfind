import Link from "next/link";
import { AdminHeader, EmptyState, Panel, StatRow } from "@/components/admin/shell";
import {
  cancelSubscriptionAction,
  refundSubscriptionAction,
  resumeSubscriptionAction,
} from "@/app/actions/admin-billing";
import { Badge, StatusPill } from "@/components/ui/primitives";
import { fullDate, money } from "@/lib/format";
import { requireStaff } from "@/lib/auth";
import { monthlyRecurringRevenue } from "@/lib/analytics";
import { db } from "@/lib/db";
import { isTestMode, stripeConfigured } from "@/lib/stripe";

export const metadata = { title: "Subscriptions" };

export default async function AdminSubscriptionsPage() {
  await requireStaff();
  const stripeReady = stripeConfigured();

  const webhookEvents = await db.webhookEvent.findMany({
    orderBy: { receivedAt: "desc" },
    take: 12,
  });

  const [subscriptions, mrr, openInvoices] = await Promise.all([
    db.subscription.findMany({
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      include: {
        plan: true,
        business: { select: { id: true, name: true, slug: true, city: { select: { name: true } } } },
        invoices: { orderBy: { issuedAt: "desc" }, take: 1 },
      },
    }),
    monthlyRecurringRevenue(),
    db.invoice.findMany({
      where: { status: "OPEN" },
      orderBy: { issuedAt: "asc" },
      include: {
        subscription: { include: { business: { select: { id: true, name: true } }, plan: true } },
      },
    }),
  ]);

  const active = subscriptions.filter((subscription) => subscription.status === "ACTIVE");
  const pastDue = subscriptions.filter((subscription) => subscription.status === "PAST_DUE");
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const churned = subscriptions.filter(
    (subscription) => subscription.status === "CANCELED" && (subscription.canceledAt ?? new Date(0)) > thirtyDaysAgo,
  );

  return (
    <>
      <AdminHeader
        title="Subscriptions"
        description="Every business subscription and its billing state. Stripe webhooks keep these records in step; the webhook is what activates a subscription, never the browser."
        actions={
          stripeReady ? (
            <Badge tone={isTestMode() ? "warning" : "positive"}>
              Stripe {isTestMode() ? "test mode" : "live"}
            </Badge>
          ) : (
            <Badge tone="neutral">Stripe not configured</Badge>
          )
        }
      />

      <StatRow
        compact
        stats={[
          { label: "Active", value: active.length },
          { label: "MRR", value: money(mrr) },
          { label: "Past due", value: pastDue.length, hint: `${openInvoices.length} open invoices` },
          { label: "Churn, 30 days", value: churned.length },
        ]}
      />

      <Panel title="All subscriptions" padded={false}>
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th scope="col">Business</th>
                <th scope="col">Plan</th>
                <th scope="col">Amount</th>
                <th scope="col">Started</th>
                <th scope="col">Renews</th>
                <th scope="col">Last invoice</th>
                <th scope="col">Status</th>
                <th scope="col" />
              </tr>
            </thead>
            <tbody>
              {subscriptions.map((subscription) => (
                <tr key={subscription.id}>
                  <td>
                    <Link
                      href={`/admin/businesses/${subscription.business.id}?tab=billing`}
                      className="admin-table__primary"
                    >
                      {subscription.business.name}
                    </Link>
                    <span className="admin-table__meta">{subscription.business.city?.name ?? "—"}</span>
                  </td>
                  <td>{subscription.plan.name}</td>
                  <td className="admin-table__num">
                    {money(subscription.plan.priceCents * subscription.quantity, subscription.plan.currency)}
                  </td>
                  <td>{fullDate(subscription.startedAt)}</td>
                  <td>{fullDate(subscription.currentPeriodEnd)}</td>
                  <td>
                    {subscription.invoices[0] ? (
                      <>
                        {subscription.invoices[0].number}
                        <span className="admin-table__meta">
                          <StatusPill status={subscription.invoices[0].status} />
                        </span>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    <StatusPill status={subscription.status} />
                    {subscription.cancelAtPeriodEnd ? (
                      <span className="admin-table__meta">Cancels at period end</span>
                    ) : null}
                    {subscription.stripeSubscriptionId ? (
                      <span className="admin-table__meta">{subscription.stripeSubscriptionId}</span>
                    ) : null}
                  </td>
                  <td>
                    <div className="admin-table__actions">
                      {subscription.status === "CANCELED" ? null : subscription.cancelAtPeriodEnd ? (
                        <form action={resumeSubscriptionAction}>
                          <input type="hidden" name="id" value={subscription.id} />
                          <button type="submit" className="btn btn--ghost btn--sm">
                            Resume
                          </button>
                        </form>
                      ) : (
                        <form action={cancelSubscriptionAction}>
                          <input type="hidden" name="id" value={subscription.id} />
                          <button type="submit" className="btn btn--ghost btn--sm">
                            Cancel at period end
                          </button>
                        </form>
                      )}
                      {subscription.invoices.some((invoice) => invoice.status === "PAID") ? (
                        <form action={refundSubscriptionAction}>
                          <input type="hidden" name="id" value={subscription.id} />
                          <input type="hidden" name="reason" value="Refunded from the admin" />
                          <button type="submit" className="btn btn--ghost btn--sm">
                            Refund and cancel
                          </button>
                        </form>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel
        title="Stripe webhook events"
        description="Every event is recorded before it is applied, so a redelivery is a no-op rather than a double charge."
        padded={webhookEvents.length === 0}
      >
        {webhookEvents.length === 0 ? (
          <EmptyState
            title="No events received"
            body="Point a Stripe webhook at /api/stripe/webhook and set STRIPE_WEBHOOK_SECRET to start receiving them."
          />
        ) : (
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th scope="col">Event</th>
                  <th scope="col">Type</th>
                  <th scope="col">Outcome</th>
                  <th scope="col">Received</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {webhookEvents.map((event) => (
                  <tr key={event.id}>
                    <td className="admin-table__primary">{event.externalId}</td>
                    <td>{event.type}</td>
                    <td style={{ color: "var(--text-secondary)" }}>{event.error ?? "—"}</td>
                    <td>{fullDate(event.receivedAt)}</td>
                    <td>
                      <Badge
                        tone={
                          event.status === "PROCESSED"
                            ? "positive"
                            : event.status === "FAILED"
                              ? "danger"
                              : "neutral"
                        }
                      >
                        {event.status.toLowerCase()}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {openInvoices.length > 0 ? (
        <Panel title="Open invoices" description="Oldest first. These are what dunning would chase." padded={false}>
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th scope="col">Invoice</th>
                  <th scope="col">Business</th>
                  <th scope="col">Plan</th>
                  <th scope="col">Issued</th>
                  <th scope="col">Amount</th>
                </tr>
              </thead>
              <tbody>
                {openInvoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td className="admin-table__primary">{invoice.number}</td>
                    <td>
                      <Link href={`/admin/businesses/${invoice.subscription.business.id}?tab=billing`}>
                        {invoice.subscription.business.name}
                      </Link>
                    </td>
                    <td>{invoice.subscription.plan.name}</td>
                    <td>{fullDate(invoice.issuedAt)}</td>
                    <td className="admin-table__num">{money(invoice.amountCents, invoice.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      ) : null}
    </>
  );
}
