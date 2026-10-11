import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

// No mail goes out from the suite; the send is stubbed and the code captured.
const sent: { to: string; code?: string }[] = [];
vi.mock("@/lib/notify", () => ({
  sendClaimReceived: async (input: { to: string; code?: string }) => {
    sent.push(input);
    return true;
  },
}));

const { db } = await import("@/lib/db");
const { checkClaimCode, emailMatchesWebsite, issueClaimCode, maskEmail, MAX_ATTEMPTS } = await import(
  "@/lib/claim-codes"
);

let claimId = "";

beforeAll(async () => {
  const claim = await db.claimRequest.create({
    data: {
      businessName: "Claim code test",
      ownerName: "Jane Tester",
      ownerEmail: "jane@acme-roofing.com",
      verificationMethod: "EMAIL",
    },
  });
  claimId = claim.id;
});

afterAll(async () => {
  await db.claimRequest.delete({ where: { id: claimId } }).catch(() => {});
});

describe("claim email codes", () => {
  it("stores only a hash and accepts the right code once", async () => {
    const { code } = await issueClaimCode(claimId);
    expect(code).toMatch(/^\d{6}$/);
    expect(sent.at(-1)?.code).toBe(code);

    const stored = await db.claimRequest.findUnique({ where: { id: claimId } });
    expect(stored?.codeHash).toBeTruthy();
    expect(stored?.codeHash).not.toContain(code);

    const wrong = code === "000000" ? "111111" : "000000";
    expect(await checkClaimCode(claimId, wrong)).toEqual({ ok: false, reason: "wrong", remaining: MAX_ATTEMPTS - 1 });
    expect(await checkClaimCode(claimId, code)).toEqual({ ok: true });

    const verified = await db.claimRequest.findUnique({ where: { id: claimId } });
    expect(verified?.emailVerifiedAt).toBeTruthy();
    expect(verified?.status).toBe("VERIFYING");
    expect(await checkClaimCode(claimId, code)).toEqual({ ok: false, reason: "verified" });
  });

  it("locks after too many wrong guesses and expires", async () => {
    await db.claimRequest.update({ where: { id: claimId }, data: { emailVerifiedAt: null, status: "SUBMITTED" } });
    const { code } = await issueClaimCode(claimId);
    const wrong = code === "123456" ? "654321" : "123456";
    for (let i = 0; i < MAX_ATTEMPTS - 1; i++) await checkClaimCode(claimId, wrong);
    expect(await checkClaimCode(claimId, wrong)).toEqual({ ok: false, reason: "locked" });
    expect(await checkClaimCode(claimId, code)).toEqual({ ok: false, reason: "locked" });

    const fresh = await issueClaimCode(claimId);
    await db.claimRequest.update({ where: { id: claimId }, data: { codeExpiresAt: new Date(Date.now() - 1000) } });
    expect(await checkClaimCode(claimId, fresh.code)).toEqual({ ok: false, reason: "expired" });
  });

  it("compares the claim address with the website domain", () => {
    expect(emailMatchesWebsite("jane@acme.com", "https://www.acme.com/")).toBe(true);
    expect(emailMatchesWebsite("jane@mail.acme.com", "acme.com")).toBe(true);
    expect(emailMatchesWebsite("jane@other.com", "https://acme.com")).toBe(false);
    expect(emailMatchesWebsite("jane@acme.com", null)).toBeNull();
    expect(maskEmail("jane@acme.com")).toBe("ja…@acme.com");
  });
});
