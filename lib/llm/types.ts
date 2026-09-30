import type { DrawnCard } from "../tarot/draw";

export type Role = "user" | "assistant";

export interface Message {
  role: Role;
  content: string;
}

export interface ReadingInput {
  question: string;
  cards: DrawnCard[];
}

export interface FollowUpInput extends ReadingInput {
  /** 앞서 들려준 첫 해석. 대화 턴이 아니라 고정된 맥락으로 넘긴다. */
  reading: string;
  /** 후속 대화만 — 사용자 질문으로 시작하고 끝난다. */
  messages: Message[];
}

/**
 * 해석을 만들어 내는 쪽의 유일한 접점.
 * 실제 LLM이든 키 없이 도는 데모든 이 인터페이스만 만족하면 된다.
 */
export interface ReadingProvider {
  streamReading(input: ReadingInput): AsyncIterable<string>;
  streamFollowUp(input: FollowUpInput): AsyncIterable<string>;
}

export type ProviderMode = "live" | "demo";
