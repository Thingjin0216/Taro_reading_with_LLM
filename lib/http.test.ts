import { describe, expect, it, vi } from "vitest";
import { streamText } from "./http";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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
