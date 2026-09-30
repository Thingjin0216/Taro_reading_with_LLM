import { READING_MODE_HEADER } from "../constants";
import type { ProviderMode } from "../llm/types";

export const FALLBACK_MESSAGE = "해석을 불러오지 못했습니다.";

/**
 * 서버가 흘려보내는 텍스트를 받는 대로 onChunk에 넘긴다.
 * 중간에 끊겨도 그때까지 받은 글자는 화면에 남는다.
 */
export async function streamPost(
  url: string,
  body: unknown,
  onChunk: (text: string) => void,
  signal?: AbortSignal,
): Promise<ProviderMode> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    let message = FALLBACK_MESSAGE;
    try {
      const data = (await response.json()) as { error?: string };
      if (data.error) message = data.error;
    } catch {
      // 본문이 비어 있을 수도 있다. 기본 문구를 쓴다.
    }
    throw new Error(message);
  }

  if (!response.body) {
    throw new Error(FALLBACK_MESSAGE);
  }

  const mode = (response.headers.get(READING_MODE_HEADER) as ProviderMode | null) ?? "demo";
  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    onChunk(decoder.decode(value, { stream: true }));
  }

  const tail = decoder.decode();
  if (tail) {
    onChunk(tail);
  }

  return mode;
}
