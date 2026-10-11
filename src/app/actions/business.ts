"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { startCheckout, type CheckoutResult } from "@/lib/billing";
import { claimReference, issueClaimCode, METHOD_LABEL } from "@/lib/claim-codes";
import { db } from "@/lib/db";
import {
  alertAdvertisingQuote,
  alertNewClaim,
  alertNewListing,
  sendClaimReceived,
  sendListingSubmitted,
} from "@/lib/notify";
import { stripeConfigured } from "@/lib/stripe";
import { routes } from "@/lib/urls";

export type ClaimState = {
  status: "idle" | "ok" | "error";
  message?: string;
  reference?: string;
  errors?: Record<string, string>;
};

const claimSchema = z.object({
  businessId: z.string().min(1, "Pick your business from the list"),
  businessName: z.string().trim().min(2, "Tell us the business name").max(200),
  ownerName: z.string().trim().min(2, "Tell us your name").max(120),
  ownerEmail: z.string().trim().email("Enter a valid email address"),
  ownerPhone: z.string().trim().max(40).optional().or(z.literal("")),
  role: z.string().trim().max(80).optional().or(z.literal("")),
  verificationMethod: z.enum(["EMAIL", "PHONE", "WEBSITE_TOKEN", "DOCUMENT"]),
  planKey: z.string().trim().min(1),
  addTop10: z.string().optional(),
});

const FREE_DOMAINS = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com", "aol.com"];

/**
 * Records the claim, then hands off to Stripe Checkout. The subscription is
 * created PENDING and only becomes ACTIVE when the webhook confirms payment, so
 * a closed browser tab never leaves a business looking subscribed.
 */
export async function submitClaim(_prev: ClaimState, formData: FormData): Promise<ClaimState> {
  const parsed = claimSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) errors[String(issue.path[0])] = issue.message;
    return { status: "error", message: "Check the highlighted fields.", errors };
  }

  const data = parsed.data;
  const business = await db.business.findUnique({ where: { id: data.businessId } });
  if (!business) return { status: "error", message: "That listing no longer exists." };
  if (business.claimed) {
    return {
      status: "error",
      message:
        "This listing is already claimed. Contact business support if you believe that is wrong.",
    };
  }

  // A generic address cannot prove ownership of a domain-backed business.
  const domain = data.ownerEmail.split("@")[1]?.toLowerCase() ?? "";
  if (data.verificationMethod === "EMAIL" && FREE_DOMAINS.includes(domain)) {
    return {
      status: "error",
      message: "Email verification needs an address on the business domain.",
      errors: {
        ownerEmail:
          "Use an address on your business domain, or choose phone or document verification.",
      },
    };
  }

  const claim = await db.claimRequest.create({
    data: {
      businessId: business.id,
      businessName: data.businessName,
      ownerName: data.ownerName,
      ownerEmail: data.ownerEmail,
      ownerPhone: data.ownerPhone || null,
      role: data.role || null,
      verificationMethod: data.verificationMethod,
      status: "SUBMITTED",
    },
  });

  let checkout: CheckoutResult;
  try {
    checkout = await startCheckout({
      businessId: business.id,
      planKey: data.planKey,
      email: data.ownerEmail,
      name: data.ownerName,
      successPath: `${routes.claim()}complete/`,
      cancelPath: routes.claim(),
    });

    // Top 10 is a second subscription rather than a line on the first, so it can
    // be cancelled on its own without touching profile management.
    if (data.addTop10 === "on") {
      await startCheckout({
        businessId: business.id,
        planKey: "top10",
        email: data.ownerEmail,
        name: data.ownerName,
        scopeCityId: business.cityId ?? undefined,
        scopeCategoryId: business.categoryId,
        successPath: `${routes.claim()}complete/`,
        cancelPath: routes.claim(),
      });
    }
  } catch (error) {
    console.error("[claim] checkout failed:", error instanceof Error ? error.message : error);
    return {
      status: "error",
      message: "We could not open the secure checkout just now. Nothing was charged. Please try again in a minute.",
    };
  }

  await db.claimRequest.update({ where: { id: claim.id }, data: { subscriptionId: checkout.subscriptionId } });

  // The receipt (with a code for email verification) and the team alert go out
  // before the hand-off to Stripe. Neither can fail the claim.
  await Promise.allSettled([
    data.verificationMethod === "EMAIL"
      ? issueClaimCode(claim.id)
      : sendClaimReceived({
          to: claim.ownerEmail,
          ownerName: claim.ownerName,
          businessName: claim.businessName,
          reference: claimReference(claim.id),
          method: METHOD_LABEL[claim.verificationMethod] ?? claim.verificationMethod,
        }),
    alertNewClaim({
      businessName: claim.businessName,
      ownerName: claim.ownerName,
      ownerEmail: claim.ownerEmail,
      role: claim.role,
      method: METHOD_LABEL[claim.verificationMethod] ?? claim.verificationMethod,
      plans: data.addTop10 === "on" ? `${data.planKey} + top10` : data.planKey,
      claimId: claim.id,
    }),
  ]);

  revalidatePath(routes.admin("/claims"));

  if (checkout.mode === "stripe") redirect(checkout.url);

  return {
    status: "ok",
    reference: claimReference(claim.id),
    message: (await stripeConfigured())
      ? "Claim submitted. Verification usually completes within two business days."
      : "Claim submitted and recorded. Payment is not configured on this environment, so an editor will complete the subscription by hand.",
  };
}

export type AddState = ClaimState;

const addSchema = z.object({
  name: z.string().trim().min(2, "Tell us the business name").max(200),
  categorySlug: z.string().trim().min(1, "Pick a category"),
  cityId: z.string().trim().min(1, "Pick a city"),
  contactName: z.string().trim().min(2, "Tell us your name"),
  contactEmail: z.string().trim().email("Enter a valid email address"),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  website: z.string().trim().max(300).optional().or(z.literal("")),
  addressLine: z.string().trim().max(300).optional().or(z.literal("")),
  description: z.string().trim().min(20, "Give us a couple of sentences").max(2000),
  serviceArea: z.string().trim().max(300).optional().or(z.literal("")),
  services: z.string().trim().max(600).optional().or(z.literal("")),
  licenseNumber: z.string().trim().max(120).optional().or(z.literal("")),
  planKey: z.string().trim().min(1),
});

/**
 * Creates the listing PENDING and opens a Checkout session that holds the card
 * on a trial. Nothing is charged until an editor publishes the listing, which
 * ends the trial; a declined listing is simply never charged.
 */
export async function submitBusiness(_prev: AddState, formData: FormData): Promise<AddState> {
  const parsed = addSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) errors[String(issue.path[0])] = issue.message;
    return { status: "error", message: "Check the highlighted fields.", errors };
  }

  const data = parsed.data;
  const category = await db.category.findUnique({ where: { slug: data.categorySlug } });
  if (!category) return { status: "error", message: "That category no longer exists." };

  const baseSlug = data.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const existing = await db.business.findUnique({ where: { slug: baseSlug } });
  const slug = existing ? `${baseSlug}-${Date.now().toString(36).slice(-4)}` : baseSlug;

  const business = await db.business.create({
    data: {
      name: data.name,
      slug,
      categoryId: category.id,
      cityId: data.cityId,
      description: data.description,
      email: data.contactEmail,
      phone: data.phone || null,
      website: data.website || null,
      addressLine: data.addressLine || null,
      licenseNumber: data.licenseNumber || null,
      status: "PENDING",
      submittedAt: new Date(),
    },
  });

  await db.submission.create({
    data: {
      kind: "BUSINESS",
      subject: `Add ${data.name}`,
      name: data.contactName,
      email: data.contactEmail,
      // The service area and the services are what the submitter says; an
      // editor checks them against the website before any of it is published.
      message: [
        data.description,
        data.serviceArea ? `Service area: ${data.serviceArea}` : "",
        data.services ? `Services: ${data.services}` : "",
        data.licenseNumber ? `Licence or registration: ${data.licenseNumber}` : "",
      ]
        .filter(Boolean)
        .join("\n\n"),
      payload: JSON.stringify({
        businessId: business.id,
        serviceArea: data.serviceArea || null,
        services: data.services ? data.services.split(",").map((item) => item.trim()).filter(Boolean) : [],
        licenseNumber: data.licenseNumber || null,
      }),
      status: "NEW",
    },
  });

  let checkout: CheckoutResult;
  try {
    checkout = await startCheckout({
      businessId: business.id,
      planKey: data.planKey,
      email: data.contactEmail,
      name: data.contactName,
      trialUntilPublished: true,
      successPath: `${routes.addBusiness()}complete/`,
      cancelPath: routes.addBusiness(),
    });
  } catch (error) {
    console.error("[add-business] checkout failed:", error instanceof Error ? error.message : error);
    return {
      status: "error",
      message:
        "We saved your submission but could not open the secure checkout just now. Nothing was charged. Please try again in a minute, or contact business support.",
    };
  }

  await Promise.allSettled([
    sendListingSubmitted({
      to: data.contactEmail,
      contactName: data.contactName,
      businessName: business.name,
      reference: business.id.slice(-8).toUpperCase(),
    }),
    alertNewListing({
      businessName: business.name,
      businessId: business.id,
      contactName: data.contactName,
      contactEmail: data.contactEmail,
      category: category.name,
      website: data.website || null,
    }),
  ]);

  revalidatePath(routes.admin("/businesses"));

  if (checkout.mode === "stripe") redirect(checkout.url);

  return {
    status: "ok",
    reference: business.id.slice(-8).toUpperCase(),
    message: (await stripeConfigured())
      ? "Submission received. An editor reviews new listings against the same standards as everything else."
      : "Submission received and recorded. Payment is not configured on this environment, so nothing was charged.",
  };
}

export type AdvertiseState = { status: "idle" | "ok" | "error"; message?: string };

const advertiseSchema = z.object({
  company: z.string().trim().min(2, "Tell us the company name"),
  email: z.string().trim().email("Enter a valid email address"),
  markets: z.string().trim().min(2, "Which markets?"),
  message: z.string().trim().max(2000).optional().or(z.literal("")),
});

export async function submitAdvertising(
  _prev: AdvertiseState,
  formData: FormData,
): Promise<AdvertiseState> {
  const parsed = advertiseSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Check the form." };
  }
  await db.submission.create({
    data: {
      kind: "CONTACT",
      subject: "Advertising enquiry",
      name: parsed.data.company,
      email: parsed.data.email,
      message: `Markets: ${parsed.data.markets}\n\n${parsed.data.message ?? ""}`,
      status: "NEW",
    },
  });
  await alertAdvertisingQuote({
    company: parsed.data.company,
    email: parsed.data.email,
    markets: parsed.data.markets,
    message: parsed.data.message || null,
  });
  revalidatePath(routes.admin("/submissions"));
  return {
    status: "ok",
    message:
      "Thanks. We check eligibility against the markets you named and come back with what is available.",
  };
}
