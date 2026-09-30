import { afterEach, describe, expect, it } from "vitest";
import { resolveProvider } from "./provider";

const original = process.env.ANTHROPIC_API_KEY;

afterEach(() => {
  if (original === undefined) {
    delete process.env.ANTHROPIC_API_KEY;
  } else {
    process.env.ANTHROPIC_API_KEY = original;
  }
});

describe("resolveProvider", () => {
  it("falls back to the demo reader when no API key is configured", () => {
    delete process.env.ANTHROPIC_API_KEY;
    expect(resolveProvider().mode).toBe("demo");
  });

  it("uses the live reader once an API key is configured", () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    expect(resolveProvider().mode).toBe("live");
  });
});
