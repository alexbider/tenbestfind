import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

// Mail is captured rather than sent; the test reads the link from the message.
const sent: { to: string; subject: string; text: string }[] = [];
vi.mock("@/lib/mail", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/mail")>()),
  sendMail: async (message: { to: string; subject: string; text: string }) => {
    sent.push(message);
    return { id: "test" };
  },
}));

const { db } = await import("@/lib/db");
const { approveClaimIfReady, consumeAuthToken, sendAccessEmail } = await import("@/lib/client-accounts");

const OWNER_EMAIL = "owner.flow.test@example.test";
let businessId = "";
let subscriptionId = "";
let claimId = "";

beforeAll(async () => {
  const business = await db.business.findFirst({ select: { id: true, claimed: true } });
  const plan = await db.plan.findFirst({ select: { id: true } });
  if (!business || !plan) throw new Error("the seed needs a business and a plan");
  businessId = business.id;
  const sub = await db.subscription.create({ data: { businessId, planId: plan.id, status: "PENDING" } });
  subscriptionId = sub.id;
  const claim = await db.claimRequest.create({
    data: {
      businessId,
      businessName: "Flow Test Business",
      ownerName: "Flow Owner",
      ownerEmail: OWNER_EMAIL,
      subscriptionId,
      emailVerifiedAt: new Date(),
      status: "VERIFYING",
    },
  });
  claimId = claim.id;
});

afterAll(async () => {
  await db.claimRequest.deleteMany({ where: { id: claimId } });
  await db.subscription.deleteMany({ where: { id: subscriptionId } });
  await db.business.update({ where: { id: businessId }, data: { claimed: false, ownerId: null } });
  await db.user.deleteMany({ where: { email: OWNER_EMAIL } });
});

describe("claim verification and owner accounts", () => {
  it("does not verify while the payment is still pending", async () => {
    expect(await approveClaimIfReady(claimId)).toBeNull();
  });

  it("verifies once paid, creates the owner and emails a password link", async () => {
    await db.subscription.update({ where: { id: subscriptionId }, data: { status: "ACTIVE" } });
    const owner = await approveClaimIfReady(claimId);
    expect(owner?.role).toBe("BUSINESS_OWNER");
    expect(owner?.passwordHash).toBe("");

    const claim = await db.claimRequest.findUnique({ where: { id: claimId } });
    expect(claim?.status).toBe("APPROVED");

    const business = await db.business.findUnique({ where: { id: businessId } });
    expect(business?.claimed).toBe(true);
    expect(business?.ownerId).toBe(owner?.id);

    const email = sent.find((m) => m.to === OWNER_EMAIL && m.subject.includes("password"));
    expect(email).toBeTruthy();
  });

  it("does nothing a second time", async () => {
    expect(await approveClaimIfReady(claimId)).toBeNull();
  });

  it("spends a sign-in link once, and only for its own purpose", async () => {
    const owner = await db.user.findUnique({ where: { email: OWNER_EMAIL } });
    expect(owner).toBeTruthy();
    await sendAccessEmail(owner!, "SIGN_IN");
    const link = sent.at(-1)!.text.match(/token=([A-Za-z0-9_-]+)/);
    expect(link).toBeTruthy();
    const token = link![1];

    expect(await consumeAuthToken(token, "SET_PASSWORD")).toBeNull();
    expect((await consumeAuthToken(token, "SIGN_IN"))?.email).toBe(OWNER_EMAIL);
    expect(await consumeAuthToken(token, "SIGN_IN")).toBeNull();
  });
});
