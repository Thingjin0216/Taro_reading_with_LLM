import { describe, expect, it } from "vitest";
import { getCard } from "../tarot/deck";
import type { DrawnCard } from "../tarot/draw";
import { demoProvider } from "./demo";

const cards: DrawnCard[] = [
  { id: "major-16", reversed: false, position: "past" },
  { id: "pentacles-09", reversed: true, position: "present" },
  { id: "wands-01", reversed: false, position: "future" },
];

const question = "새로운 일을 시작해도 될까?";

describe("demoProvider.streamReading", () => {
  it("arrives in more than one chunk so the page can type it out", async () => {
    const chunks = await Array.fromAsync(demoProvider.streamReading({ question, cards }));
    expect(chunks.length).toBeGreaterThan(1);
  });

  it("mentions every drawn card by its Korean name", async () => {
    const text = (await Array.fromAsync(demoProvider.streamReading({ question, cards }))).join("");
    for (const card of cards) {
      expect(text, card.id).toContain(getCard(card.id)!.nameKo);
    }
  });

  it("uses the keywords for the orientation each card came up in", async () => {
    const text = (await Array.fromAsync(demoProvider.streamReading({ question, cards }))).join("");
    expect(text).toContain(getCard("major-16")!.keywordsUpright[0]);
    expect(text).toContain(getCard("pentacles-09")!.keywordsReversed[0]);
  });

  it("echoes the question that was asked", async () => {
    const text = (await Array.fromAsync(demoProvider.streamReading({ question, cards }))).join("");
    expect(text).toContain(question);
  });
});

describe("demoProvider.streamFollowUp", () => {
  it("answers the newest question with something non-empty", async () => {
    const text = (
      await Array.fromAsync(
        demoProvider.streamFollowUp({
          question,
          cards,
          reading: "세 장을 함께 보면…",
          messages: [{ role: "user", content: "언제 시작하면 좋을까요?" }],
        }),
      )
    ).join("");
    expect(text.trim().length).toBeGreaterThan(20);
    expect(text).toContain("언제 시작하면 좋을까요?");
  });
});
