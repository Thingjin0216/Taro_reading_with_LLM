import { describe, expect, it } from "vitest";
import { withParticle } from "./korean";

describe("withParticle", () => {
  it("picks 이 after a syllable that ends in a consonant", () => {
    expect(withParticle("힘", "이/가")).toBe("힘이");
    expect(withParticle("컵 퀸", "이/가")).toBe("컵 퀸이");
    expect(withParticle("태양", "이/가")).toBe("태양이");
  });

  it("picks 가 after a syllable that ends in a vowel", () => {
    expect(withParticle("절제", "이/가")).toBe("절제가");
    expect(withParticle("바보", "이/가")).toBe("바보가");
    expect(withParticle("완드 에이스", "이/가")).toBe("완드 에이스가");
  });

  it("reads a trailing digit the way Korean says it", () => {
    expect(withParticle("완드 8", "이/가")).toBe("완드 8이");
    expect(withParticle("완드 2", "이/가")).toBe("완드 2가");
    expect(withParticle("펜타클 5", "이/가")).toBe("펜타클 5가");
    expect(withParticle("소드 10", "이/가")).toBe("소드 10이");
  });

  it("handles the object particle too", () => {
    expect(withParticle("완드 8", "을/를")).toBe("완드 8을");
    expect(withParticle("절제", "을/를")).toBe("절제를");
  });

  it("handles the topic particle too", () => {
    expect(withParticle("탑", "은/는")).toBe("탑은");
    expect(withParticle("별", "은/는")).toBe("별은");
    expect(withParticle("악마", "은/는")).toBe("악마는");
  });
});
