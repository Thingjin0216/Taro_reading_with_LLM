import { describe, expect, it } from "vitest";
import { splitParagraphs } from "./text";

describe("splitParagraphs", () => {
  it("splits on blank lines", () => {
    expect(splitParagraphs("첫 문단\n\n둘째 문단")).toEqual(["첫 문단", "둘째 문단"]);
  });

  it("treats a blank line that holds spaces as a break too", () => {
    // EXAONE은 문단 끝에 공백 두 칸을 붙여 "  \n\n"으로 끊곤 한다.
    expect(splitParagraphs("첫 문단  \n \n둘째 문단")).toEqual(["첫 문단", "둘째 문단"]);
  });

  it("keeps a single line break inside its paragraph", () => {
    expect(splitParagraphs("한 줄\n이어지는 줄")).toEqual(["한 줄\n이어지는 줄"]);
  });

  it("drops empty paragraphs", () => {
    expect(splitParagraphs("\n\n문단\n\n\n\n")).toEqual(["문단"]);
    expect(splitParagraphs("")).toEqual([]);
  });
});
