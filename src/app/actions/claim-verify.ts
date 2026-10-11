"use server";

import { revalidatePath } from "next/cache";
import {
  checkClaimCode,
  emailMatchesWebsite,
  issueClaimCode,
  maskEmail,
  MAX_ATTEMPTS,
  RESEND_SECONDS,
} from "@/lib/claim-codes";
import { db } from "@/lib/db";
import { alertClaimEmailVerified } from "@/lib/notify";
import { routes } from "@/lib/urls";

export type CodeState = { status: "idle" | "ok" | "error" | "sent"; message?: string };

/** Checks the six-digit code a claimant typed in. */
export async function verifyClaimCode(_prev: CodeState, formData: FormData): Promise<CodeState> {
  const claimId = String(formData.get("claimId") ?? "");
  const code = String(formData.get("code") ?? "");
  if (!claimId) return { status: "error", message: "This claim link is incomplete. Open the link in your email again." };
  if (!/^\d{6}$/.test(code.replace(/\s/g, ""))) {
    return { status: "error", message: "Enter the six digits from the email." };
  }

  const result = await checkClaimCode(claimId, code);
  if (!result.ok) {
    const messages: Record<string, string> = {
      missing: "There is no code waiting for this claim. Send a new one below.",
      verified: "This address is already verified. There is nothing more to do here.",
      expired: "That code has expired. Send a new one below.",
      locked: `Too many wrong tries. Send a new code below and use that one instead.`,
      wrong: `That code is not right. ${result.remaining} ${result.remaining === 1 ? "try" : "tries"} left.`,
    };
    return { status: "error", message: messages[result.reason] };
  }

  const claim = await db.claimRequest.findUnique({
    where: { id: claimId },
    include: { business: { select: { website: true } } },
  });
  if (claim) {
    await alertClaimEmailVerified({
      businessName: claim.businessName,
      ownerEmail: claim.ownerEmail,
      claimId: claim.id,
      domainMatches: emailMatchesWebsite(claim.ownerEmail, claim.business?.website),
    });
  }
  revalidatePath(routes.admin("/claims"));
  return {
    status: "ok",
    message: "Email verified. An editor confirms the match against the listing and approves the claim, usually within two business days.",
  };
}

/** Sends a fresh code, at most once a minute. */
export async function resendClaimCode(_prev: CodeState, formData: FormData): Promise<CodeState> {
  const claimId = String(formData.get("claimId") ?? "");
  const claim = claimId ? await db.claimRequest.findUnique({ where: { id: claimId } }) : null;
  if (!claim || claim.verificationMethod !== "EMAIL") {
    return { status: "error", message: "This claim does not use email verification." };
  }
  if (claim.emailVerifiedAt) return { status: "error", message: "This address is already verified." };
  if (claim.status === "APPROVED" || claim.status === "REJECTED") {
    return { status: "error", message: "This claim has already been decided." };
  }
  const wait = claim.codeSentAt ? RESEND_SECONDS - (Date.now() - claim.codeSentAt.getTime()) / 1000 : 0;
  if (wait > 0) {
    return { status: "error", message: `Give it ${Math.ceil(wait)} seconds before asking for another code.` };
  }

  const { sent } = await issueClaimCode(claim.id);
  if (!sent) return { status: "error", message: "We could not send the email just now. Try again in a minute." };
  return {
    status: "sent",
    message: `A new code is on its way to ${maskEmail(claim.ownerEmail)}. You have ${MAX_ATTEMPTS} tries with it.`,
  };
}
