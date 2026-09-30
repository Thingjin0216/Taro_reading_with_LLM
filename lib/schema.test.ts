import { describe, expect, it } from "vitest";
import { MAX_FOLLOW_UP_TURNS, MAX_HISTORY_MESSAGES, MAX_QUESTION_LENGTH } from "./constants";
import type { Message } from "./llm/types";
import { chatRequestSchema, readingRequestSchema, trimHistory } from "./schema";

const validCards = [
  { id: "major-00", reversed: false, position: "past" },
  { id: "cups-03", reversed: true, position: "present" },
  { id: "swords-10", reversed: false, position: "future" },
];

const validReading = { question: "이직을 해야 할까?", cards: validCards };

describe("readingRequestSchema", () => {
  it("accepts a well formed reading", () => {
    expect(readingRequestSchema.safeParse(validReading).success).toBe(true);
  });

  it("rejects a card id that is not in the deck", () => {
    const cards = [{ ...validCards[0], id: "major-99" }, validCards[1], validCards[2]];
    expect(readingRequestSchema.safeParse({ ...validReading, cards }).success).toBe(false);
  });

  it("rejects a spread that is not three cards", () => {
    expect(readingRequestSchema.safeParse({ ...validReading, cards: validCards.slice(0, 2) }).success).toBe(false);
  });

  it("rejects the same card drawn twice", () => {
    const cards = [validCards[0], { ...validCards[0], position: "present" }, validCards[2]];
    expect(readingRequestSchema.safeParse({ ...validReading, cards }).success).toBe(false);
  });

  it("rejects a spread missing the past, present, future positions", () => {
    const cards = validCards.map((card) => ({ ...card, position: "past" }));
    expect(readingRequestSchema.safeParse({ ...validReading, cards }).success).toBe(false);
  });

  it("rejects a blank question", () => {
    expect(readingRequestSchema.safeParse({ ...validReading, question: "   " }).success).toBe(false);
  });

  it("rejects a question longer than the limit", () => {
    const question = "가".repeat(MAX_QUESTION_LENGTH + 1);
    expect(readingRequestSchema.safeParse({ ...validReading, question }).success).toBe(false);
  });
});

describe("chatRequestSchema", () => {
  const validChat = {
    ...validReading,
    reading: "세 장을 함께 보면…",
    messages: [{ role: "user", content: "지금 옮기는 게 나을까요?" }],
  };

  it("accepts a reading, its interpretation and the follow-up so far", () => {
    expect(chatRequestSchema.safeParse(validChat).success).toBe(true);
  });

  it("requires the interpretation the follow-up is about", () => {
    const withoutReading = { ...validReading, messages: validChat.messages };
    expect(chatRequestSchema.safeParse(withoutReading).success).toBe(false);
    expect(chatRequestSchema.safeParse({ ...validChat, reading: "   " }).success).toBe(false);
  });

  it("rejects an empty conversation", () => {
    expect(chatRequestSchema.safeParse({ ...validChat, messages: [] }).success).toBe(false);
  });

  it("rejects a conversation that does not end with the user's question", () => {
    const messages = [...validChat.messages, { role: "assistant", content: "현재 자리의 절제가 말해 주듯…" }];
    expect(chatRequestSchema.safeParse({ ...validChat, messages }).success).toBe(false);
  });

  it("rejects more follow-up turns than allowed", () => {
    const tooMany = Array.from({ length: MAX_FOLLOW_UP_TURNS + 1 }, () => ({
      role: "user" as const,
      content: "하나 더 물어볼게요",
    }));
    expect(chatRequestSchema.safeParse({ ...validChat, messages: tooMany }).success).toBe(false);
  });
});

/** user로 시작해 번갈아 오가는 대화. 마지막이 user가 되도록 길이를 홀수로 준다. */
function conversation(length: number): Message[] {
  return Array.from({ length }, (_, index) => ({
    role: index % 2 === 0 ? "user" : "assistant",
    content: `메시지 ${index}`,
  }));
}

describe("trimHistory", () => {
  it("keeps only the most recent messages", () => {
    const messages = conversation(MAX_HISTORY_MESSAGES + 5);
    const trimmed = trimHistory(messages);
    expect(trimmed.length).toBeLessThanOrEqual(MAX_HISTORY_MESSAGES);
    expect(trimmed.at(-1)).toEqual(messages.at(-1));
  });

  it("never starts with an answer whose question was cut off", () => {
    const trimmed = trimHistory(conversation(MAX_HISTORY_MESSAGES + 1));
    expect(trimmed[0].role).toBe("user");
  });

  it("leaves a short conversation untouched", () => {
    const messages = conversation(3);
    expect(trimHistory(messages)).toEqual(messages);
  });
});
