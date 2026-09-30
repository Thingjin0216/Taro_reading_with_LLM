import Anthropic from "@anthropic-ai/sdk";
import { MAX_OUTPUT_TOKENS, providerFromStream } from "./prompts";
import type { ReadingProvider } from "./types";

export const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-5";

export function createAnthropicProvider({ apiKey, model }: { apiKey: string; model: string }): ReadingProvider {
  const client = new Anthropic({ apiKey });

  return providerFromStream(async function* ({ system, messages }) {
    const response = client.messages.stream({ model, max_tokens: MAX_OUTPUT_TOKENS, system, messages });

    for await (const event of response) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        yield event.delta.text;
      }
    }
  });
}
