import { describe, expect, it } from "vitest";
import { getCard } from "../tarot/deck";
import type { DrawnCard } from "../tarot/draw";
import { buildFollowUpMessages, buildReadingMessages, SYSTEM_PROMPT } from "./prompts";

const cards: DrawnCard[] = [
  { id: "major-00", reversed: false, position: "past" },
  { id: "cups-03", reversed: true, position: "present" },
  { id: "swords-10", reversed: false, position: "future" },
];

const question = "이직을 해야 할까?";

describe("SYSTEM_PROMPT", () => {
  it("tells the reader to answer in Korean without declaring fate", () => {
    expect(SYSTEM_PROMPT).toContain("한국어");
    expect(SYSTEM_PROMPT).toContain("단정");
  });
});

describe("buildReadingMessages", () => {
  const [message] = buildReadingMessages({ question, cards });

  it("sends a single user message", () => {
    expect(buildReadingMessages({ question, cards })).toHaveLength(1);
    expect(message.role).toBe("user");
  });

  it("includes the question", () => {
    expect(message.content).toContain(question);
  });

  it("names each card with its position and orientation", () => {
    expect(message.content).toContain("과거");
    expect(message.content).toContain("현재");
    expect(message.content).toContain("미래");
    expect(message.content).toContain(getCard("major-00")!.nameKo);
    expect(message.content).toContain(getCard("cups-03")!.nameKo);
    expect(message.content).toContain(getCard("swords-10")!.nameKo);
    expect(message.content).toContain("정방향");
    expect(message.content).toContain("역방향");
  });

  it("passes the keywords matching each card's orientation", () => {
    expect(message.content).toContain(getCard("major-00")!.keywordsUpright[0]);
    expect(message.content).toContain(getCard("cups-03")!.keywordsReversed[0]);
  });
});

describe("buildFollowUpMessages", () => {
  const history = [
    { role: "assistant" as const, content: "세 장을 함께 보면…" },
    { role: "user" as const, content: "지금 옮기는 게 나을까요?" },
  ];
  const messages = buildFollowUpMessages({ question, cards, messages: history });

  it("keeps the spread in front of the conversation", () => {
    expect(messages[0].role).toBe("user");
    expect(messages[0].content).toContain(getCard("major-00")!.nameKo);
  });

  it("ends with the newest user question", () => {
    expect(messages.at(-1)).toEqual(history.at(-1));
  });
});
