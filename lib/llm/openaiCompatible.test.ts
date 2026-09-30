import { describe, expect, it } from "vitest";
import { getCard } from "../tarot/deck";
import type { DrawnCard } from "../tarot/draw";
import { createOpenAICompatibleProvider } from "./openaiCompatible";
import { followUpPrompt, readingPrompt } from "./prompts";

const cards: DrawnCard[] = [
  { id: "major-17", reversed: false, position: "past" },
  { id: "cups-02", reversed: true, position: "present" },
  { id: "wands-10", reversed: false, position: "future" },
];

const question = "지금 관계를 계속 이어가도 될까요?";

interface RecordedCall {
  url: string;
  headers: Headers;
  body: {
    model: string;
    stream: boolean;
    temperature?: number;
    top_p?: number;
    messages: Array<{ role: string; content: string }>;
  };
}

function sse(...pieces: string[]): Response {
  const lines = pieces.map((piece) => `data: ${JSON.stringify({ choices: [{ delta: { content: piece } }] })}\n\n`);
  return new Response(lines.join("") + "data: [DONE]\n\n", {
    headers: { "content-type": "text/event-stream" },
  });
}

function recordingFetch(respond: () => Response = () => sse("응답")) {
  const calls: RecordedCall[] = [];
  const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({
      url: String(input),
      headers: new Headers(init?.headers),
      body: JSON.parse(String(init?.body)),
    });
    return respond();
  }) as typeof fetch;
  return { fetchImpl, calls };
}

async function collect(stream: AsyncIterable<string>): Promise<string> {
  return (await Array.fromAsync(stream)).join("");
}

function provider(overrides: Partial<Parameters<typeof createOpenAICompatibleProvider>[0]> = {}) {
  const recorder = recordingFetch();
  const reader = createOpenAICompatibleProvider({
    baseUrl: "http://127.0.0.1:8000/v1",
    model: "exaone",
    fetch: recorder.fetchImpl,
    ...overrides,
  });
  return { reader, calls: recorder.calls };
}

describe("createOpenAICompatibleProvider", () => {
  it("streams the text the model sends", async () => {
    const { fetchImpl } = recordingFetch(() => sse("세 장을 ", "함께 ", "봅니다."));
    const reader = createOpenAICompatibleProvider({ baseUrl: "http://x/v1", model: "exaone", fetch: fetchImpl });
    expect(await collect(reader.streamReading({ question, cards }))).toBe("세 장을 함께 봅니다.");
  });

  it("posts to the chat completions endpoint under the base url", async () => {
    const { reader, calls } = provider({ baseUrl: "http://127.0.0.1:8000/v1/" });
    await collect(reader.streamReading({ question, cards }));
    expect(calls[0].url).toBe("http://127.0.0.1:8000/v1/chat/completions");
  });

  it("asks the configured model for a streamed answer", async () => {
    const { reader, calls } = provider({ model: "exaone" });
    await collect(reader.streamReading({ question, cards }));
    expect(calls[0].body.model).toBe("exaone");
    expect(calls[0].body.stream).toBe(true);
  });

  it("gives the reading instructions first and then the spread", async () => {
    const { reader, calls } = provider();
    await collect(reader.streamReading({ question, cards }));
    const [system, spread] = calls[0].body.messages;
    expect(system).toEqual({ role: "system", content: readingPrompt({ question, cards }).system });
    expect(spread.role).toBe("user");
    expect(spread.content).toContain(question);
    expect(spread.content).toContain(getCard("cups-02")!.nameKo);
  });

  const followUpInput = {
    question,
    cards,
    reading: "세 장을 함께 보면…",
    messages: [{ role: "user" as const, content: "언제쯤 달라질까요?" }],
  };

  it("switches to the follow-up instructions for a follow-up question", async () => {
    const { reader, calls } = provider();
    await collect(reader.streamFollowUp(followUpInput));
    expect(calls[0].body.messages[0]).toEqual({ role: "system", content: followUpPrompt(followUpInput).system });
  });

  it("sends the conversation so far with a follow-up question", async () => {
    const { reader, calls } = provider();
    await collect(reader.streamFollowUp(followUpInput));
    expect(calls[0].body.messages).toEqual([
      { role: "system", content: followUpPrompt(followUpInput).system },
      ...followUpPrompt(followUpInput).messages,
    ]);
  });

  it("leaves sampling to the model server when no temperature is set", async () => {
    // EXAONE의 권장값은 serve-exaone.sh가 서버 쪽 기본값으로 건다. 범용 클라이언트가 덮어쓰지 않는다.
    const { reader, calls } = provider();
    await collect(reader.streamReading({ question, cards }));
    expect(calls[0].body.temperature).toBeUndefined();
    expect(calls[0].body.top_p).toBeUndefined();
  });

  it("uses the configured temperature", async () => {
    const { reader, calls } = provider({ temperature: 0.3 });
    await collect(reader.streamReading({ question, cards }));
    expect(calls[0].body.temperature).toBe(0.3);
  });

  it("leaves out the authorization header when no API key is set", async () => {
    const { reader, calls } = provider();
    await collect(reader.streamReading({ question, cards }));
    expect(calls[0].headers.has("authorization")).toBe(false);
  });

  it("sends the API key as a bearer token when one is set", async () => {
    const { reader, calls } = provider({ apiKey: "sk-local" });
    await collect(reader.streamReading({ question, cards }));
    expect(calls[0].headers.get("authorization")).toBe("Bearer sk-local");
  });

  it("reports the status when the model server refuses the request", async () => {
    const { fetchImpl } = recordingFetch(() => new Response("model is loading", { status: 503 }));
    const reader = createOpenAICompatibleProvider({ baseUrl: "http://x/v1", model: "exaone", fetch: fetchImpl });
    await expect(collect(reader.streamReading({ question, cards }))).rejects.toThrow(/503/);
  });
});
