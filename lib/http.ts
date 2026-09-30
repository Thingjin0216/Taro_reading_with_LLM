import type { ZodType } from "zod";
import { READING_MODE_HEADER } from "./constants";
import type { ProviderMode } from "./llm/types";
import { apiLimiter, clientKey, type RateLimiter } from "./rateLimit";

function jsonError(message: string, status: number, headers?: HeadersInit): Response {
  return Response.json({ error: message }, { status, headers });
}

/**
 * 두 API 라우트가 함께 거치는 관문 — 레이트 리밋, JSON 파싱, 스키마 검증.
 * 통과하면 검증된 값을, 막히면 그대로 돌려줄 오류 응답을 준다.
 */
export async function parseRequest<T>(
  request: Request,
  schema: ZodType<T>,
  limiter: RateLimiter = apiLimiter,
): Promise<T | Response> {
  const limit = limiter.check(clientKey(request));
  if (!limit.allowed) {
    return jsonError(`요청이 조금 빨랐습니다. ${limit.retryAfterSeconds}초 뒤에 다시 시도해 주세요.`, 429, {
      "retry-after": String(limit.retryAfterSeconds),
    });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonError("요청을 읽을 수 없습니다.", 400);
  }

  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "요청이 올바르지 않습니다.", 400);
  }
  return parsed.data;
}

/**
 * 텍스트 조각을 그대로 흘려보낸다. 클라이언트는 받은 만큼 화면에 쌓는다.
 *
 * 사용자가 읽던 중 페이지를 떠나면 스트림이 취소된다. 그건 오류가 아니라
 * 흔한 일이므로 조용히 멈춘다 — 로그는 정말로 실패했을 때만 남긴다.
 */
export function streamText(chunks: AsyncIterable<string>, mode: ProviderMode): Response {
  const encoder = new TextEncoder();
  let cancelled = false;

  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of chunks) {
          if (cancelled) {
            return;
          }
          controller.enqueue(encoder.encode(chunk));
        }
      } catch (error) {
        if (!cancelled) {
          console.error("해석 스트림이 중단되었습니다", error);
          controller.error(error);
        }
        return;
      }

      if (!cancelled) {
        controller.close();
      }
    },

    cancel() {
      cancelled = true;
    },
  });

  return new Response(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
      [READING_MODE_HEADER]: mode,
    },
  });
}
