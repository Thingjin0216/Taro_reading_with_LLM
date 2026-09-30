import { describe, expect, it } from "vitest";
import { DECK } from "./deck";
import { sourceFileName, sourceUrl } from "./wikimedia";

describe("sourceFileName", () => {
  it("names major arcana with their RWS title", () => {
    expect(sourceFileName("major-00")).toBe("RWS_Tarot_00_Fool.jpg");
    expect(sourceFileName("major-10")).toBe("RWS_Tarot_10_Wheel_of_Fortune.jpg");
    expect(sourceFileName("major-21")).toBe("RWS_Tarot_21_World.jpg");
  });

  it("names minor arcana with the suit abbreviation Commons uses", () => {
    expect(sourceFileName("wands-01")).toBe("Wands01.jpg");
    expect(sourceFileName("cups-14")).toBe("Cups14.jpg");
    expect(sourceFileName("swords-07")).toBe("Swords07.jpg");
    expect(sourceFileName("pentacles-01")).toBe("Pents01.jpg");
  });

  it("covers every card in the deck", () => {
    for (const card of DECK) {
      expect(sourceFileName(card.id), card.id).toMatch(/\.jpg$/);
    }
  });

  it("throws for an id that is not in the deck", () => {
    expect(() => sourceFileName("major-99")).toThrow();
  });
});

describe("sourceUrl", () => {
  it("asks Commons for the file at the requested width", () => {
    expect(sourceUrl("major-00", 600)).toBe(
      "https://commons.wikimedia.org/wiki/Special:FilePath/RWS_Tarot_00_Fool.jpg?width=600",
    );
  });
});
