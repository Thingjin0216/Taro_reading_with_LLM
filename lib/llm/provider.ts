import { createAnthropicProvider } from "./anthropic";
import { demoProvider } from "./demo";
import type { ProviderMode, ReadingProvider } from "./types";

export interface ResolvedProvider {
  provider: ReadingProvider;
  mode: ProviderMode;
}

/**
 * 키가 있으면 실제 모델, 없으면 데모 대역.
 * 배포된 데모가 키 없이도 늘 동작하도록 하는 것이 이 함수의 존재 이유다.
 */
export function resolveProvider(): ResolvedProvider {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    return { provider: demoProvider, mode: "demo" };
  }
  return { provider: createAnthropicProvider(apiKey), mode: "live" };
}
