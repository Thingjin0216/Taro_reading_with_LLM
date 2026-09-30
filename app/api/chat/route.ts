import { resolveProvider } from "@/lib/llm/provider";
import { jsonError, streamText } from "@/lib/http";
import { apiLimiter, clientKey } from "@/lib/rateLimit";
import { chatRequestSchema, trimHistory } from "@/lib/schema";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const limit = apiLimiter.check(clientKey(request));
  if (!limit.allowed) {
    return jsonError(
      `요청이 조금 빨랐습니다. ${limit.retryAfterSeconds}초 뒤에 다시 시도해 주세요.`,
      429,
      { "retry-after": String(limit.retryAfterSeconds) },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonError("요청을 읽을 수 없습니다.", 400);
  }

  const parsed = chatRequestSchema.safeParse(payload);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "요청이 올바르지 않습니다.", 400);
  }

  const { provider, mode } = resolveProvider();
  const { question, cards, messages } = parsed.data;
  return streamText(provider.streamFollowUp({ question, cards, messages: trimHistory(messages) }), mode);
}
