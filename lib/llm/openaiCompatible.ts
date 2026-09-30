import { MAX_OUTPUT_TOKENS, providerFromStream } from "./prompts";
import { readChatCompletionStream } from "./sse";
import type { ReadingProvider } from "./types";

export interface OpenAICompatibleOptions {
  /** 예: vLLM으로 띄운 EXAONE이라면 http://127.0.0.1:8765/v1 */
  baseUrl: string;
  model: string;
  apiKey?: string;
  /** 비워 두면 모델 서버의 기본값을 따른다. EXAONE의 권장값은 serve-exaone.sh가 서버 쪽에 건다. */
  temperature?: number;
  /** 테스트에서 가짜 서버를 끼워 넣을 때만 쓴다. */
  fetch?: typeof fetch;
}

/**
 * `/v1/chat/completions`를 말하는 서버라면 무엇이든 붙는다.
 * vLLM(EXAONE), Ollama, Gemini·OpenRouter의 호환 엔드포인트가 모두 여기에 해당한다.
 */
export function createOpenAICompatibleProvider({
  baseUrl,
  model,
  apiKey,
  temperature,
  fetch: fetchImpl = (input, init) => fetch(input, init),
}: OpenAICompatibleOptions): ReadingProvider {
  const endpoint = `${baseUrl.replace(/\/+$/, "")}/chat/completions`;
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (apiKey) {
    headers.authorization = `Bearer ${apiKey}`;
  }

  return providerFromStream(async function* ({ system, messages }) {
    const response = await fetchImpl(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        stream: true,
        max_tokens: MAX_OUTPUT_TOKENS,
        temperature,
        messages: [{ role: "system", content: system }, ...messages],
      }),
    });

    if (!response.ok || !response.body) {
      const detail = await response.text().catch(() => "");
      throw new Error(`모델 서버가 요청을 거절했습니다 (HTTP ${response.status}) ${detail.slice(0, 200)}`.trim());
    }

    yield* readChatCompletionStream(response.body);
  });
}
