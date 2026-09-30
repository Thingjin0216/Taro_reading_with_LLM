import { describe, expect, it } from "vitest";
import {
  MAX_FOLLOW_UP_TURNS,
  MAX_HISTORY_MESSAGES,
  MAX_QUESTION_LENGTH,
  chatRequestSchema,
  readingRequestSchema,
  trimHistory,
} from "./schema";

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
  const messages = [
    { role: "assistant", content: "세 장을 함께 보면…" },
    { role: "user", content: "지금 옮기는 게 나을까요?" },
  ];

  it("accepts a reading plus its conversation so far", () => {
    expect(chatRequestSchema.safeParse({ ...validReading, messages }).success).toBe(true);
  });

  it("rejects an empty conversation", () => {
    expect(chatRequestSchema.safeParse({ ...validReading, messages: [] }).success).toBe(false);
  });

  it("rejects more follow-up turns than allowed", () => {
    const tooMany = Array.from({ length: MAX_FOLLOW_UP_TURNS + 1 }, () => ({
      role: "user" as const,
      content: "하나 더 물어볼게요",
    }));
    expect(chatRequestSchema.safeParse({ ...validReading, messages: tooMany }).success).toBe(false);
  });
});

describe("trimHistory", () => {
  it("keeps only the most recent messages", () => {
    const messages = Array.from({ length: MAX_HISTORY_MESSAGES + 5 }, (_, i) => ({
      role: "user" as const,
      content: `메시지 ${i}`,
    }));
    const trimmed = trimHistory(messages);
    expect(trimmed).toHaveLength(MAX_HISTORY_MESSAGES);
    expect(trimmed.at(-1)?.content).toBe(`메시지 ${messages.length - 1}`);
  });

  it("leaves a short conversation untouched", () => {
    const messages = [{ role: "user" as const, content: "안녕" }];
    expect(trimHistory(messages)).toEqual(messages);
  });
});
