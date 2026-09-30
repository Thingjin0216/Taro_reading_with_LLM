import { parseRequest, streamText } from "@/lib/http";
import { resolveProvider } from "@/lib/llm/provider";
import { readingRequestSchema } from "@/lib/schema";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const input = await parseRequest(request, readingRequestSchema);
  if (input instanceof Response) {
    return input;
  }

  const { provider, mode } = resolveProvider();
  return streamText(provider.streamReading(input), mode);
}
