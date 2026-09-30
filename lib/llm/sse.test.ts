import { describe, expect, it } from "vitest";
import { readChatCompletionStream } from "./sse";

const encoder = new TextEncoder();

function streamOf(...parts: Array<string | Uint8Array>): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      for (const part of parts) {
        controller.enqueue(typeof part === "string" ? encoder.encode(part) : part);
      }
      controller.close();
    },
  });
}

function delta(content: string): string {
  return `data: ${JSON.stringify({ choices: [{ index: 0, delta: { content } }] })}\n\n`;
}

describe("readChatCompletionStream", () => {
  it("yields each content piece in order", async () => {
    const pieces = await Array.fromAsync(readChatCompletionStream(streamOf(delta("세 장을"), delta(" 함께"), "data: [DONE]\n\n")));
    expect(pieces).toEqual(["세 장을", " 함께"]);
  });

  it("stops at the done marker", async () => {
    const pieces = await Array.fromAsync(readChatCompletionStream(streamOf(delta("끝"), "data: [DONE]\n\n", delta("무시"))));
    expect(pieces).toEqual(["끝"]);
  });

  it("puts back together a line that arrives in two chunks", async () => {
    const line = delta("과거의 자리");
    const pieces = await Array.fromAsync(readChatCompletionStream(streamOf(line.slice(0, 20), line.slice(20), "data: [DONE]\n\n")));
    expect(pieces).toEqual(["과거의 자리"]);
  });

  it("puts back together a Korean character split across byte chunks", async () => {
    const bytes = encoder.encode(delta("별"));
    const middleOfCharacter = bytes.indexOf(0xeb) + 1;
    const pieces = await Array.fromAsync(
      readChatCompletionStream(streamOf(bytes.slice(0, middleOfCharacter), bytes.slice(middleOfCharacter), "data: [DONE]\n\n")),
    );
    expect(pieces).toEqual(["별"]);
  });

  it("skips reasoning text and role-only deltas", async () => {
    const roleOnly = `data: ${JSON.stringify({ choices: [{ delta: { role: "assistant" } }] })}\n\n`;
    const reasoning = `data: ${JSON.stringify({ choices: [{ delta: { reasoning_content: "생각 중" } }] })}\n\n`;
    const pieces = await Array.fromAsync(readChatCompletionStream(streamOf(roleOnly, reasoning, delta("답"), "data: [DONE]\n\n")));
    expect(pieces).toEqual(["답"]);
  });

  it("ignores keep-alive comments and blank lines", async () => {
    const pieces = await Array.fromAsync(readChatCompletionStream(streamOf(": keep-alive\n\n", "\n", delta("달"), "data: [DONE]\n\n")));
    expect(pieces).toEqual(["달"]);
  });

  it("accepts CRLF line endings", async () => {
    const line = `data: ${JSON.stringify({ choices: [{ delta: { content: "해" } }] })}\r\n\r\n`;
    const pieces = await Array.fromAsync(readChatCompletionStream(streamOf(line, "data: [DONE]\r\n\r\n")));
    expect(pieces).toEqual(["해"]);
  });

  it("finishes cleanly when the server closes without a done marker", async () => {
    const pieces = await Array.fromAsync(readChatCompletionStream(streamOf(delta("탑"))));
    expect(pieces).toEqual(["탑"]);
  });

  it("cancels the model's response when the reader stops early", async () => {
    let cancelled = false;
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode(delta("첫 조각")));
        controller.enqueue(encoder.encode(delta("둘째 조각")));
      },
      cancel() {
        cancelled = true;
      },
    });

    for await (const piece of readChatCompletionStream(body)) {
      expect(piece).toBe("첫 조각");
      break;
    }

    expect(cancelled).toBe(true);
  });

  it("throws the message of an error event", async () => {
    const error = `data: ${JSON.stringify({ error: { message: "model overloaded" } })}\n\n`;
    await expect(Array.fromAsync(readChatCompletionStream(streamOf(delta("시작"), error)))).rejects.toThrow("model overloaded");
  });
});
