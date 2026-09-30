/**
 * OpenAI 호환 서버(vLLM, Ollama, Gemini 등)가 보내는 스트리밍 응답에서 답변 텍스트만 뽑아낸다.
 * 추론 모델이 보내는 생각 과정(reasoning_content)은 화면에 보이지 않으므로 버린다.
 */
interface ChatCompletionChunk {
  choices?: Array<{ delta?: { content?: string | null } }>;
  error?: { message?: string };
}

const DATA_PREFIX = "data:";
const DONE_MARKER = "[DONE]";

export async function* readChatCompletionStream(body: ReadableStream<Uint8Array>): AsyncIterable<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    for (;;) {
      const { done, value } = await reader.read();
      buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });

      // 마지막 줄은 아직 덜 온 것일 수 있으니, 스트림이 끝날 때까지 남겨 둔다.
      const lines = buffer.split(/\r?\n/);
      buffer = done ? "" : (lines.pop() ?? "");

      for (const line of lines) {
        if (!line.startsWith(DATA_PREFIX)) {
          continue;
        }
        const data = line.slice(DATA_PREFIX.length).trim();
        if (data === DONE_MARKER) {
          return;
        }
        if (!data) {
          continue;
        }

        const chunk = JSON.parse(data) as ChatCompletionChunk;
        if (chunk.error) {
          throw new Error(chunk.error.message ?? "모델 서버가 오류를 보냈습니다");
        }
        const content = chunk.choices?.[0]?.delta?.content;
        if (content) {
          yield content;
        }
      }

      if (done) {
        return;
      }
    }
  } finally {
    // 사용자가 떠나 읽기를 멈췄다면 모델 서버에도 알려 생성을 멈추게 한다.
    await reader.cancel().catch(() => {});
  }
}
