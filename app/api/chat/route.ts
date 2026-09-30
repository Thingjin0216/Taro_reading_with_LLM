import { parseRequest, streamText } from "@/lib/http";
import { resolveProvider } from "@/lib/llm/provider";
import { chatRequestSchema, trimHistory } from "@/lib/schema";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const input = await parseRequest(request, chatRequestSchema);
  if (input instanceof Response) {
    return input;
  }

  const { provider, mode } = resolveProvider();
  return streamText(provider.streamFollowUp({ ...input, messages: trimHistory(input.messages) }), mode);
}
