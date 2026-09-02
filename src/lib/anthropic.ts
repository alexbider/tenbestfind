import Anthropic from "@anthropic-ai/sdk";
import { jsonSchemaOutputFormat } from "@anthropic-ai/sdk/helpers/json-schema";
import type { z } from "zod";
import { getSecret } from "./secrets";

// Claude writes the listing copy. Opus 5 is the default because the copy is the
// product here; the model and the effort are settings so a large backfill can
// be run cheaper without a deploy.
export const DEFAULT_MODEL = "claude-opus-5";

export class ContentError extends Error {}

/**
 * A failure that will happen again on the next call and on every call after
 * that: no credits, a bad key, a model this account cannot use. Retrying is
 * pointless and, when it is a paid call, wasteful. The pipeline stops the whole
 * batch on one of these rather than working through the rest of the queue.
 */
export class PermanentError extends ContentError {
  constructor(
    message: string,
    readonly hint: string,
  ) {
    super(message);
  }
}

/** Turns an SDK error into either a PermanentError or something retryable. */
export function classify(error: unknown): Error {
  if (error instanceof PermanentError) return error;

  if (error instanceof Anthropic.AuthenticationError) {
    return new PermanentError(
      "The Anthropic API key was rejected.",
      "Check the key under Admin, Integrations. It may have been revoked or mistyped.",
    );
  }
  if (error instanceof Anthropic.PermissionDeniedError) {
    return new PermanentError(
      "This Anthropic key is not allowed to use that model.",
      "Check the key's permissions, or set IMPORT_MODEL to a model the account can use.",
    );
  }
  if (error instanceof Anthropic.BadRequestError) {
    const message = error.message ?? "";
    if (/credit balance is too low|insufficient.*credit|billing/i.test(message)) {
      return new PermanentError(
        "The Anthropic account has no credits left.",
        "Add credits at console.anthropic.com under Plans and Billing, then resume the batch. Nothing needs scraping again.",
      );
    }
    return new PermanentError(
      `Anthropic rejected the request: ${message.slice(0, 200)}`,
      "This will not fix itself on a retry. The request shape or the model name is wrong.",
    );
  }
  if (error instanceof Anthropic.NotFoundError) {
    return new PermanentError(
      "That model does not exist for this account.",
      "Clear IMPORT_MODEL to fall back to the default, or set it to a model the account has.",
    );
  }

  return error instanceof Error ? error : new Error(String(error));
}

let cached: { key: string; client: Anthropic } | null = null;

export async function anthropic(): Promise<Anthropic> {
  const key = await getSecret("anthropic.apiKey");
  if (!key) throw new ContentError("No Anthropic API key is set. Add one under Admin, Integrations.");
  if (cached?.key === key) return cached.client;
  // maxRetries covers 429 and 5xx; a batch of a few hundred will hit both.
  const client = new Anthropic({ apiKey: key, maxRetries: 4, timeout: 180_000 });
  cached = { key, client };
  return client;
}

export type Effort = "low" | "medium" | "high" | "xhigh" | "max";

/**
 * One structured call. The schema is sent as JSON Schema so the response comes
 * back already shaped, and it is then re-checked with the matching Zod schema so
 * a malformed listing fails here rather than halfway through a database write.
 *
 * The system prompt goes in a cached block: it is identical for every listing in
 * a batch and is most of the input tokens.
 */
export async function askForJson<T extends z.ZodType>({
  system,
  prompt,
  schema,
  jsonSchema,
  model = DEFAULT_MODEL,
  effort = "medium",
  maxTokens = 16000,
}: {
  system: string;
  prompt: string;
  schema: T;
  jsonSchema: Record<string, unknown>;
  model?: string;
  effort?: Effort;
  maxTokens?: number;
}): Promise<z.infer<T>> {
  const client = await anthropic();

  let response;
  try {
    response = await client.messages.parse({
      model,
      max_tokens: maxTokens,
      system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: prompt }],
      output_config: {
        effort,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- the helper
        // infers its result type from a literal schema; ours is built at runtime.
        format: jsonSchemaOutputFormat(jsonSchema as any),
      },
    });
  } catch (error) {
    // Rate limits and 5xx have already been retried by the SDK, so anything
    // arriving here is either permanent or worth reporting as it stands.
    throw classify(error);
  }

  if (response.stop_reason === "refusal") {
    throw new ContentError(
      `The model declined this listing (${response.stop_details?.category ?? "no category"}).`,
    );
  }
  if (response.stop_reason === "max_tokens") {
    throw new ContentError("The model ran out of output tokens before finishing the listing.");
  }
  if (!response.parsed_output) {
    throw new ContentError("The model returned content that did not match the expected shape.");
  }

  const checked = schema.safeParse(response.parsed_output);
  if (!checked.success) {
    throw new ContentError(`The listing failed validation: ${checked.error.issues[0]?.message ?? "unknown"}`);
  }

  return checked.data as z.infer<T>;
}

/**
 * A single tiny call to prove the account can actually generate before a batch
 * spends anything on scraping. It costs a fraction of a cent and turns "pay
 * Apify for twenty places, then discover the writer is dead" into a failure
 * that happens in two seconds for nothing.
 */
export async function preflight(model = DEFAULT_MODEL): Promise<void> {
  const client = await anthropic();
  try {
    await client.messages.create({
      model,
      max_tokens: 1,
      messages: [{ role: "user", content: "ok" }],
    });
  } catch (error) {
    throw classify(error);
  }
}
