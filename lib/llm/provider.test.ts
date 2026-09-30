import { beforeEach, describe, expect, it, vi } from "vitest";
import { openAICompatibleConfig, resolveProvider } from "./provider";

// 테스트마다 모델 설정을 비운다. 원래 값은 vitest가 되돌린다(unstubEnvs).
beforeEach(() => {
  for (const key of ["ANTHROPIC_API_KEY", "ANTHROPIC_MODEL", "LLM_BASE_URL", "LLM_MODEL", "LLM_API_KEY", "LLM_TEMPERATURE"]) {
    vi.stubEnv(key, undefined);
  }
});

describe("resolveProvider", () => {
  it("falls back to the demo reader when nothing is configured", () => {
    expect(resolveProvider()).toMatchObject({ mode: "demo", backend: "demo" });
  });

  it("uses Claude once an Anthropic key is configured", () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-test");
    expect(resolveProvider()).toMatchObject({ mode: "live", backend: "anthropic" });
  });

  it("uses an OpenAI-compatible server such as EXAONE on vLLM when a base URL is configured", () => {
    vi.stubEnv("LLM_BASE_URL", "http://127.0.0.1:8000/v1");
    expect(resolveProvider()).toMatchObject({ mode: "live", backend: "openai-compatible" });
  });

  it("prefers Claude when both are configured", () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-test");
    vi.stubEnv("LLM_BASE_URL", "http://127.0.0.1:8000/v1");
    expect(resolveProvider().backend).toBe("anthropic");
  });

  it("treats a blank base URL as not configured", () => {
    vi.stubEnv("LLM_BASE_URL", "   ");
    expect(resolveProvider().backend).toBe("demo");
  });
});

describe("openAICompatibleConfig", () => {
  it("returns nothing without a base URL", () => {
    expect(openAICompatibleConfig({})).toBeNull();
  });

  it("defaults the model to the name the EXAONE serve script registers", () => {
    expect(openAICompatibleConfig({ LLM_BASE_URL: "http://x/v1" })?.model).toBe("exaone");
  });

  it("reads the model, key and temperature from the environment", () => {
    expect(
      openAICompatibleConfig({
        LLM_BASE_URL: "http://x/v1",
        LLM_MODEL: "gemini-2.5-flash",
        LLM_API_KEY: "key",
        LLM_TEMPERATURE: "0.3",
      }),
    ).toEqual({ baseUrl: "http://x/v1", model: "gemini-2.5-flash", apiKey: "key", temperature: 0.3 });
  });

  it("leaves the temperature to the model server when none is usable", () => {
    for (const LLM_TEMPERATURE of [undefined, "", "warm", "-1"]) {
      expect(openAICompatibleConfig({ LLM_BASE_URL: "http://x/v1", LLM_TEMPERATURE })?.temperature).toBeUndefined();
    }
  });
});
