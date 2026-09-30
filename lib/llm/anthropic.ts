import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT, buildFollowUpMessages, buildReadingMessages } from "./prompts";
import type { Message, ReadingProvider } from "./types";

export const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5";

const MAX_TOKENS = 1200;

export function createAnthropicProvider(apiKey: string): ReadingProvider {
  const client = new Anthropic({ apiKey });

  async function* stream(messages: Message[]): AsyncIterable<string> {
    const response = client.messages.stream({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      messages: messages.map((message) => ({ role: message.role, content: message.content })),
    });

    for await (const event of response) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        yield event.delta.text;
      }
    }
  }

  return {
    streamReading: (input) => stream(buildReadingMessages(input)),
    streamFollowUp: (input) => stream(buildFollowUpMessages(input)),
  };
}
