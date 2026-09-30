import { setTimeout as sleep } from "node:timers/promises";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { parseRequest, streamText } from "./http";
import { createRateLimiter } from "./rateLimit";

async function* chunksOf(pieces: string[]): AsyncIterable<string> {
  for (const piece of pieces) {
    yield piece;
    await sleep(1);
  }
}

async function* endless(): AsyncIterable<string> {
  for (let index = 0; index < 500; index += 1) {
    yield "가";
    await sleep(2);
  }
}

describe("streamText", () => {
  it("hands the client everything the reader produced", async () => {
    const response = streamText(chunksOf(["안녕", "하세요"]), "demo");
    expect(await response.text()).toBe("안녕하세요");
  });

  it("says which reader produced the text", () => {
    expect(streamText(chunksOf(["…"]), "live").headers.get("x-reading-mode")).toBe("live");
  });

  it("stays quiet when the client leaves mid-stream", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = streamText(endless(), "demo");

    const reader = response.body!.getReader();
    await reader.read();
    await reader.cancel();
    await sleep(30);

    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("reports a reader that actually failed", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    async function* broken(): AsyncIterable<string> {
      yield "시작";
      throw new Error("모델이 응답을 멈췄습니다");
    }

    const response = streamText(broken(), "live");
    await expect(response.text()).rejects.toThrow();
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});

describe("parseRequest", () => {
  const schema = z.object({ question: z.string().min(1, "질문을 입력해 주세요") });
  const roomy = () => createRateLimiter({ limit: 10, windowMs: 60_000 });

  function post(body: string): Request {
    return new Request("http://localhost/api/reading", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.1" },
      body,
    });
  }

  it("hands back the validated body", async () => {
    expect(await parseRequest(post('{"question":"안녕"}'), schema, roomy())).toEqual({ question: "안녕" });
  });

  it("answers 400 when the body is not JSON", async () => {
    const result = await parseRequest(post("not json"), schema, roomy());
    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(400);
  });

  it("answers 400 with the first validation message", async () => {
    const result = (await parseRequest(post('{"question":""}'), schema, roomy())) as Response;
    expect(result.status).toBe(400);
    expect(await result.json()).toEqual({ error: "질문을 입력해 주세요" });
  });

  it("answers 429 with a retry-after once the client is over the limit", async () => {
    const tight = createRateLimiter({ limit: 1, windowMs: 60_000 });
    await parseRequest(post('{"question":"안녕"}'), schema, tight);
    const result = (await parseRequest(post('{"question":"안녕"}'), schema, tight)) as Response;
    expect(result.status).toBe(429);
    expect(result.headers.get("retry-after")).toBe("60");
  });
});
