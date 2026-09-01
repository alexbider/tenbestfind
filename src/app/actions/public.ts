"use server";

import { z } from "zod";
import { db } from "@/lib/db";

const contactSchema = z.object({
  topic: z.enum(["general", "correction", "business", "advertising", "accessibility"]),
  name: z.string().trim().min(1, "Tell us your name").max(120),
  email: z.string().trim().email("Enter a valid email address"),
  pageUrl: z.string().trim().max(500).optional().or(z.literal("")),
  message: z.string().trim().min(10, "Give us a little more detail").max(5000),
});

export type FormState = { status: "idle" | "ok" | "error"; message?: string; errors?: Record<string, string> };

const TOPIC_KIND: Record<string, string> = {
  general: "CONTACT",
  correction: "CORRECTION",
  business: "CONTACT",
  advertising: "CONTACT",
  accessibility: "CORRECTION",
};

const TOPIC_SUBJECT: Record<string, string> = {
  general: "General question",
  correction: "Report incorrect information",
  business: "Business support",
  advertising: "Advertising enquiry",
  accessibility: "Accessibility barrier",
};

export async function submitContact(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = contactSchema.safeParse({
    topic: formData.get("topic"),
    name: formData.get("name"),
    email: formData.get("email"),
    pageUrl: formData.get("pageUrl") ?? "",
    message: formData.get("message"),
  });

  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      errors[String(issue.path[0])] = issue.message;
    }
    return { status: "error", message: "Check the highlighted fields.", errors };
  }

  const data = parsed.data;
  await db.submission.create({
    data: {
      kind: TOPIC_KIND[data.topic] ?? "CONTACT",
      subject: TOPIC_SUBJECT[data.topic] ?? "General question",
      name: data.name,
      email: data.email,
      pageUrl: data.pageUrl || null,
      message: data.message,
      status: "NEW",
    },
  });

  return {
    status: "ok",
    message:
      "Thanks, that reached the right team. Corrections are checked against the primary source, and we reply either way.",
  };
}

const rankingRequestSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  message: z.string().trim().min(3).max(2000),
});

export async function requestRanking(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = rankingRequestSchema.safeParse({
    email: formData.get("email"),
    message: formData.get("message"),
  });
  if (!parsed.success) {
    return { status: "error", message: "Enter a valid email and tell us the market." };
  }
  await db.submission.create({
    data: {
      kind: "RANKING_REQUEST",
      subject: "Ranking request",
      email: parsed.data.email,
      message: parsed.data.message,
      status: "NEW",
    },
  });
  return { status: "ok", message: "Noted. We work outward from the largest metros, and this goes on the list." };
}
