import Anthropic from "@anthropic-ai/sdk";
import { jsonSchemaOutputFormat } from "@anthropic-ai/sdk/helpers/json-schema";
import type { z } from "zod";
import { getSecret } from "./secrets";

// Claude writes the listing copy. Opus 5 is the default because the copy is the
// product here; the model and the effort are settings so a large backfill can
// be run cheaper without a deploy.
export const DEFAULT_MODEL = "claude-opus-5";

export class ContentError extends Error {}

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

  const response = await client.messages.parse({
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
