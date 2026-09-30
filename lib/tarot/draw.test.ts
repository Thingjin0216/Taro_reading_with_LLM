import { describe, expect, it } from "vitest";
import { DECK, getCard } from "./deck";
import { createRng, describeDrawn, drawFromShuffled, orientationLabel, shuffleDeck } from "./draw";

const alwaysZero = () => 0;
const alwaysHigh = () => 0.999;

describe("shuffleDeck", () => {
  it("keeps every card exactly once", () => {
    const shuffled = shuffleDeck(createRng(1));
    expect(shuffled).toHaveLength(78);
    expect(new Set(shuffled.map((card) => card.id)).size).toBe(78);
  });

  it("returns the same order for the same seed", () => {
    expect(shuffleDeck(createRng(42)).map((c) => c.id)).toEqual(
      shuffleDeck(createRng(42)).map((c) => c.id),
    );
  });

  it("returns a different order than the unshuffled deck", () => {
    const shuffled = shuffleDeck(createRng(7)).map((c) => c.id);
    expect(shuffled).not.toEqual(DECK.map((c) => c.id));
  });
});

describe("drawFromShuffled", () => {
  const shuffled = shuffleDeck(createRng(3));

  it("draws the cards sitting at the chosen positions", () => {
    const drawn = drawFromShuffled(shuffled, [0, 5, 77], alwaysHigh);
    expect(drawn.map((d) => d.id)).toEqual([
      shuffled[0].id,
      shuffled[5].id,
      shuffled[77].id,
    ]);
  });

  it("labels the three cards past, present and future in pick order", () => {
    const drawn = drawFromShuffled(shuffled, [10, 2, 40], alwaysHigh);
    expect(drawn.map((d) => d.position)).toEqual(["past", "present", "future"]);
  });

  it("marks cards reversed when the rng falls below the threshold", () => {
    const drawn = drawFromShuffled(shuffled, [0, 1, 2], alwaysZero);
    expect(drawn.map((d) => d.reversed)).toEqual([true, true, true]);
  });

  it("marks cards upright when the rng is above the threshold", () => {
    const drawn = drawFromShuffled(shuffled, [0, 1, 2], alwaysHigh);
    expect(drawn.map((d) => d.reversed)).toEqual([false, false, false]);
  });

  it("rejects anything other than three positions", () => {
    expect(() => drawFromShuffled(shuffled, [0, 1], alwaysHigh)).toThrow();
  });

  it("rejects repeated positions", () => {
    expect(() => drawFromShuffled(shuffled, [4, 4, 9], alwaysHigh)).toThrow();
  });

  it("rejects positions outside the deck", () => {
    expect(() => drawFromShuffled(shuffled, [0, 1, 78], alwaysHigh)).toThrow();
  });
});

describe("orientationLabel", () => {
  it("names the orientation in Korean", () => {
    expect(orientationLabel(false)).toBe("정방향");
    expect(orientationLabel(true)).toBe("역방향");
  });
});

describe("describeDrawn", () => {
  it("spells out the card, its position and its orientation", () => {
    const described = describeDrawn({ id: "cups-03", reversed: true, position: "present" });
    expect(described.card.nameKo).toBe(getCard("cups-03")!.nameKo);
    expect(described.positionLabel).toBe("현재");
    expect(described.orientation).toBe("역방향");
  });

  it("picks the keywords for the orientation the card came up in", () => {
    const card = getCard("major-16")!;
    expect(describeDrawn({ id: card.id, reversed: false, position: "past" }).keywords).toEqual(card.keywordsUpright);
    expect(describeDrawn({ id: card.id, reversed: true, position: "past" }).keywords).toEqual(card.keywordsReversed);
  });

  it("throws for a card that is not in the deck", () => {
    expect(() => describeDrawn({ id: "major-99", reversed: false, position: "past" })).toThrow();
  });
});
