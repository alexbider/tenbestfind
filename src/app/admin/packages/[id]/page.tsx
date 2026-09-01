import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminHeader, Panel } from "@/components/admin/shell";
import { PlanEditor } from "@/components/admin/DirectoryEditors";
import { Badge } from "@/components/ui/primitives";
import { fullDate, money } from "@/lib/format";
import { requireAdmin } from "@/lib/auth";
import { parseList } from "@/lib/json";
import { db } from "@/lib/db";
import { isTestMode, stripeConfigured } from "@/lib/stripe";

export const metadata = { title: "Plan" };

type Props = { params: Promise<{ id: string }> };

export default async function AdminPlanEditor({ params }: Props) {
  await requireAdmin();
  const { id } = await params;
  const isNew = id === "new";

  const plan = isNew
    ? null
    : await db.plan.findUnique({
        where: { id },
        include: { _count: { select: { subscriptions: true } } },
      });
  if (!isNew && !plan) notFound();

  const active = plan
    ? await db.subscription.count({ where: { planId: plan.id, status: "ACTIVE" } })
    : 0;

  return (
    <>
      <AdminHeader
        title={plan ? plan.name : "New plan"}
        description={
          plan
            ? `${plan.interval === "quote" ? "Quoted" : money(plan.priceCents, plan.currency)} ${plan.unitLabel} · ${active} active · ${plan._count.subscriptions} lifetime`
            : "Add something a business can buy."
        }
        actions={
          <>
            {stripeConfigured() ? (
              <Badge tone={isTestMode() ? "warning" : "positive"}>
                Stripe {isTestMode() ? "test mode" : "live"}
              </Badge>
            ) : (
              <Badge tone="neutral">Stripe not configured</Badge>
            )}
            <Link href="/admin/packages" className="btn btn--secondary btn--sm">
              Back to packages
            </Link>
          </>
        }
      />

      <div className="panel-grid panel-grid--wide">
        <Panel title="Plan">
          <PlanEditor
            plan={{
              id: plan?.id,
              key: plan?.key ?? "",
              name: plan?.name ?? "",
              description: plan?.description ?? "",
              priceCents: String(plan?.priceCents ?? 0),
              currency: plan?.currency ?? "USD",
              interval: plan?.interval ?? "month",
              unitLabel: plan?.unitLabel ?? "per location",
              features: plan ? parseList(plan.features) : [],
              sortOrder: String(plan?.sortOrder ?? 0),
              editorial: plan?.editorial ?? false,
              active: plan?.active ?? true,
              stripePriceId: plan?.stripePriceId ?? null,
            }}
          />
        </Panel>

        <Panel title="Stripe mapping">
          {plan ? (
            <dl className="transparency__grid" style={{ background: "none", padding: 0 }}>
              <div>
                <dt>Product</dt>
                <dd>{plan.stripeProductId ?? "Not created"}</dd>
              </div>
              <div>
                <dt>Price</dt>
                <dd>{plan.stripePriceId ?? "Not created"}</dd>
              </div>
              <div>
                <dt>Last synced</dt>
                <dd>{fullDate(plan.stripeSyncedAt)}</dd>
              </div>
              <div>
                <dt>Active subscribers</dt>
                <dd>{active}</dd>
              </div>
            </dl>
          ) : (
            <p style={{ fontSize: 14.5, color: "var(--text-secondary)" }}>
              Saving creates the Stripe product and price, when Stripe is configured.
            </p>
          )}
          <p
            style={{
              fontSize: 13.5,
              color: "var(--text-secondary)",
              lineHeight: 1.6,
              marginTop: 18,
              paddingTop: 16,
              borderTop: "1px solid var(--border-subtle)",
            }}
          >
            A price in Stripe cannot be edited once it exists, so changing the amount here creates a
            new one and points the plan at it. Anyone already subscribed keeps paying the price they
            signed up on until they move plan.
          </p>
        </Panel>
      </div>
    </>
  );
}
