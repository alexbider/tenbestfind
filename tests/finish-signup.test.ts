import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/notify", () => ({ sendFinishSignup: async () => true }));
vi.mock("@/lib/billing", () => ({ startCheckout: async () => ({ mode: "recorded", subscriptionId: "x" }) }));

const { finishSignupToken, readFinishSignupToken } = await import("@/lib/finish-signup");

describe("finish-signup links", () => {
  it("reads back the subscription a token was made for", () => {
    expect(readFinishSignupToken(finishSignupToken("cmw9ysy1y1e2znwp2d961bkf9"))).toBe("cmw9ysy1y1e2znwp2d961bkf9");
  });

  it("refuses a token pointed at another subscription", () => {
    const [, mac] = finishSignupToken("sub-a").split(".");
    expect(readFinishSignupToken(`sub-b.${mac}`)).toBeNull();
  });

  it("refuses malformed tokens", () => {
    expect(readFinishSignupToken("")).toBeNull();
    expect(readFinishSignupToken("only-an-id")).toBeNull();
    expect(readFinishSignupToken("sub-a.short")).toBeNull();
  });
});
