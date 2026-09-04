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
  // Permanent, not merely an error: no amount of retrying conjures a key, and
  // every attempt behind it has already paid for a website crawl or a scrape.
  if (!key) {
    throw new PermanentError(
      "No Anthropic API key is set.",
      "Add one under Admin, Integrations, then run this again.",
    );
  }
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
export type JsonAsk = {
  system: string;
  prompt: string;
  jsonSchema: Record<string, unknown>;
  model?: string;
  effort?: Effort;
  maxTokens?: number;
};

/**
 * The request body, built once and used two ways: sent directly when something
 * is waiting on the answer, or handed to the Batch API when nothing is.
 *
 * Keeping one builder is the point. The batch tier is half price for a request
 * that is byte-identical to the direct one, and two builders would drift.
 */
export function jsonRequest({
  system,
  prompt,
  jsonSchema,
  model = DEFAULT_MODEL,
  effort = "medium",
  maxTokens = 16000,
}: JsonAsk) {
  return {
    model,
    max_tokens: maxTokens,
    system: [{ type: "text" as const, text: system, cache_control: { type: "ephemeral" as const } }],
    messages: [{ role: "user" as const, content: prompt }],
    output_config: {
      effort,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- the helper
      // infers its result type from a literal schema; ours is built at runtime.
      format: jsonSchemaOutputFormat(jsonSchema as any),
    },
  };
}

/** The checks that turn a finished message into a value, or into a reason. */
function readMessage<T extends z.ZodType>(
  response: { stop_reason: string | null; stop_details?: { category?: string | null } | null },
  parsed: unknown,
  schema: T,
): z.infer<T> {
  if (response.stop_reason === "refusal") {
    throw new ContentError(
      `The model declined this listing (${response.stop_details?.category ?? "no category"}).`,
    );
  }
  if (response.stop_reason === "max_tokens") {
    throw new ContentError("The model ran out of output tokens before finishing the listing.");
  }
  if (parsed === null || parsed === undefined) {
    throw new ContentError("The model returned content that did not match the expected shape.");
  }

  const checked = schema.safeParse(parsed);
  if (!checked.success) {
    throw new ContentError(`The listing failed validation: ${checked.error.issues[0]?.message ?? "unknown"}`);
  }
  return checked.data as z.infer<T>;
}

export async function askForJson<T extends z.ZodType>({
  schema,
  ...ask
}: JsonAsk & { schema: T }): Promise<z.infer<T>> {
  const client = await anthropic();

  let response;
  try {
    response = await client.messages.parse(jsonRequest(ask));
  } catch (error) {
    // Rate limits and 5xx have already been retried by the SDK, so anything
    // arriving here is either permanent or worth reporting as it stands.
    throw classify(error);
  }

  return readMessage(response, response.parsed_output, schema);
}

// ---------------------------------------------------------------------------
// The batch tier
//
// Half price for the same request, in exchange for waiting. Nothing in the
// import is waiting: the pipeline already advances one slice per worker tick,
// so a wave that comes back in twenty minutes costs the same wall clock as a
// wave written one company at a time, and half the money.
//
// The three calls below are submit, poll and read, because the pipeline cannot
// hold a promise open across ticks. State lives in the database between them.

export type BatchAsk = JsonAsk & { customId: string };

/** Queues a wave and returns the batch id to store. */
export async function submitJsonBatch(asks: BatchAsk[]): Promise<string> {
  const client = await anthropic();
  try {
    const batch = await client.messages.batches.create({
      requests: asks.map(({ customId, ...ask }) => ({
        custom_id: customId,
        params: jsonRequest(ask),
      })),
    });
    return batch.id;
  } catch (error) {
    throw classify(error);
  }
}

/**
 * A wave takes minutes at best and an hour at worst, while the worker comes
 * back every ten seconds, so the answer is only actually asked for once a
 * minute. In between the wave is reported as still running, which is what it
 * is. The record is in memory on purpose: a restart asking once more costs
 * nothing, and the worker is one long-lived process.
 */
const POLL_EVERY_MS = 60_000;
const lastPolled = new Map<string, number>();

/** True once every request in the wave has an answer of some kind. */
export async function jsonBatchReady(batchId: string): Promise<boolean> {
  const since = Date.now() - (lastPolled.get(batchId) ?? 0);
  if (since < POLL_EVERY_MS) return false;
  lastPolled.set(batchId, Date.now());

  const client = await anthropic();
  try {
    const batch = await client.messages.batches.retrieve(batchId);
    if (batch.processing_status !== "ended") return false;
    lastPolled.delete(batchId);
    return true;
  } catch (error) {
    throw classify(error);
  }
}

export async function cancelJsonBatch(batchId: string): Promise<void> {
  const client = await anthropic();
  await client.messages.batches.cancel(batchId).catch(() => undefined);
}

/**
 * The batch tier returns the raw message, so the JSON that messages.parse()
 * would have handed back has to be read out here. A structured response is one
 * text block holding the whole object, which is what the SDK's own parser
 * reads: the first text block, parsed as JSON.
 */
export function readBatchMessage<T extends z.ZodType>(
  message: {
    stop_reason: string | null;
    stop_details?: { category?: string | null } | null;
    content: { type: string }[];
  },
  schema: T,
): z.infer<T> {
  const first = message.content.find((block) => block.type === "text");
  const text = (first as { text?: string } | undefined)?.text ?? "";

  let parsed: unknown = null;
  try {
    parsed = text.trim().length > 0 ? JSON.parse(text) : null;
  } catch {
    parsed = null;
  }

  return readMessage(message, parsed, schema);
}

/**
 * One result. A batch answers per request, so a single company that the model
 * refused or that came back malformed must not take the other forty-nine with
 * it: the failure travels as a value rather than a throw.
 */
export type BatchOutcome<T> =
  | { customId: string; ok: true; value: T }
  | { customId: string; ok: false; reason: string };

/**
 * Reads a finished wave. Results arrive in whatever order the service finished
 * them, so the caller matches on custom_id rather than position.
 */
export async function readJsonBatch<T extends z.ZodType>(
  batchId: string,
  schema: T,
): Promise<BatchOutcome<z.infer<T>>[]> {
  const client = await anthropic();
  const out: BatchOutcome<z.infer<T>>[] = [];

  let results;
  try {
    results = await client.messages.batches.results(batchId);
  } catch (error) {
    throw classify(error);
  }

  for await (const entry of results) {
    const customId = entry.custom_id;
    const result = entry.result;

    if (result.type !== "succeeded") {
      const detail =
        result.type === "errored"
          ? (result.error?.error?.message ?? result.error?.type ?? "unknown error")
          : result.type;
      out.push({ customId, ok: false, reason: `The batch request ${detail}.` });
      continue;
    }

    try {
      out.push({ customId, ok: true, value: readBatchMessage(result.message, schema) });
    } catch (error) {
      out.push({
        customId,
        ok: false,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return out;
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
