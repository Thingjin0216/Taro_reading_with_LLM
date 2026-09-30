import { describe, expect, it } from "vitest";
import { DECK, MINOR_SUITS, getCard } from "./deck";

describe("DECK", () => {
  it("contains exactly 78 cards", () => {
    expect(DECK).toHaveLength(78);
  });

  it("gives every card a unique id", () => {
    const ids = new Set(DECK.map((card) => card.id));
    expect(ids.size).toBe(78);
  });

  it("contains 22 major arcana numbered 0 through 21", () => {
    const major = DECK.filter((card) => card.arcana === "major");
    expect(major).toHaveLength(22);
    expect(major.map((card) => card.number).sort((a, b) => a - b)).toEqual(
      Array.from({ length: 22 }, (_, i) => i),
    );
  });

  it("contains 14 cards numbered 1 through 14 in each minor suit", () => {
    for (const suit of MINOR_SUITS) {
      const cards = DECK.filter((card) => card.suit === suit);
      expect(cards, suit).toHaveLength(14);
      expect(cards.map((card) => card.number).sort((a, b) => a - b)).toEqual(
        Array.from({ length: 14 }, (_, i) => i + 1),
      );
    }
  });

  it("names every card in both Korean and English", () => {
    for (const card of DECK) {
      expect(card.nameKo.trim(), card.id).not.toBe("");
      expect(card.nameEn.trim(), card.id).not.toBe("");
    }
  });

  it("gives every card upright and reversed keywords", () => {
    for (const card of DECK) {
      expect(card.keywordsUpright.length, card.id).toBeGreaterThanOrEqual(3);
      expect(card.keywordsReversed.length, card.id).toBeGreaterThanOrEqual(3);
    }
  });

  it("points every card at an image derived from its id", () => {
    for (const card of DECK) {
      expect(card.image, card.id).toBe(`/cards/${card.id}.webp`);
    }
  });
});

describe("getCard", () => {
  it("returns the card matching a known id", () => {
    expect(getCard("major-00")?.nameEn).toBe("The Fool");
  });

  it("returns undefined for an unknown id", () => {
    expect(getCard("major-99")).toBeUndefined();
  });
});
