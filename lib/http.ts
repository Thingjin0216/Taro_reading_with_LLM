import { READING_MODE_HEADER } from "./constants";
import type { ProviderMode } from "./llm/types";

export function jsonError(message: string, status: number, headers?: HeadersInit): Response {
  return Response.json({ error: message }, { status, headers });
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
