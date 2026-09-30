import { DEFAULT_ANTHROPIC_MODEL, createAnthropicProvider } from "./anthropic";
import { demoProvider } from "./demo";
import { createOpenAICompatibleProvider, type OpenAICompatibleOptions } from "./openaiCompatible";
import type { ProviderMode, ReadingProvider } from "./types";

export type ProviderBackend = "anthropic" | "openai-compatible" | "demo";

export interface ResolvedProvider {
  provider: ReadingProvider;
  mode: ProviderMode;
  backend: ProviderBackend;
}

/** scripts/serve-exaone.sh가 vLLM에 등록하는 모델 이름. */
const DEFAULT_MODEL = "exaone";

type Env = Record<string, string | undefined>;

/** LLM_BASE_URL이 있으면 OpenAI 호환 서버(EXAONE on vLLM 등)를 쓸 설정을 만든다. */
export function openAICompatibleConfig(env: Env): Omit<OpenAICompatibleOptions, "fetch"> | null {
  const baseUrl = env.LLM_BASE_URL?.trim();
  if (!baseUrl) {
    return null;
  }

  // 비었거나 쓸 수 없는 값이면 보내지 않고 모델 서버의 기본값에 맡긴다. `Number("")`는 0이라 따로 거른다.
  const rawTemperature = env.LLM_TEMPERATURE?.trim();
  const temperature = rawTemperature ? Number(rawTemperature) : Number.NaN;

  return {
    baseUrl,
    model: env.LLM_MODEL?.trim() || DEFAULT_MODEL,
    apiKey: env.LLM_API_KEY?.trim() || undefined,
    temperature: Number.isFinite(temperature) && temperature >= 0 ? temperature : undefined,
  };
}

/**
 * Claude 키 → OpenAI 호환 서버 → 데모 대역 순서로 고른다.
 * 어느 것도 없어도 배포된 데모가 늘 동작하도록 하는 것이 이 함수의 존재 이유다.
 */
export function resolveProvider(): ResolvedProvider {
  const anthropicKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (anthropicKey) {
    const model = process.env.ANTHROPIC_MODEL?.trim() || DEFAULT_ANTHROPIC_MODEL;
    return { provider: createAnthropicProvider({ apiKey: anthropicKey, model }), mode: "live", backend: "anthropic" };
  }

  const compatible = openAICompatibleConfig(process.env);
  if (compatible) {
    return { provider: createOpenAICompatibleProvider(compatible), mode: "live", backend: "openai-compatible" };
  }

  return { provider: demoProvider, mode: "demo", backend: "demo" };
}
