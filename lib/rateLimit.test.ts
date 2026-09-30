import { describe, expect, it } from "vitest";
import { createRateLimiter } from "./rateLimit";

function limiterAt(clock: { value: number }) {
  return createRateLimiter({ limit: 3, windowMs: 10_000, now: () => clock.value });
}

describe("createRateLimiter", () => {
  it("lets a client through up to the limit", () => {
    const clock = { value: 0 };
    const limiter = limiterAt(clock);
    for (let i = 0; i < 3; i += 1) {
      expect(limiter.check("1.2.3.4").allowed, `요청 ${i + 1}`).toBe(true);
    }
  });

  it("turns away the request past the limit", () => {
    const clock = { value: 0 };
    const limiter = limiterAt(clock);
    for (let i = 0; i < 3; i += 1) limiter.check("1.2.3.4");
    expect(limiter.check("1.2.3.4").allowed).toBe(false);
  });

  it("reports how long the client should wait", () => {
    const clock = { value: 0 };
    const limiter = limiterAt(clock);
    for (let i = 0; i < 3; i += 1) limiter.check("1.2.3.4");
    clock.value = 4_000;
    expect(limiter.check("1.2.3.4").retryAfterSeconds).toBe(6);
  });

  it("lets the client back in once the window has passed", () => {
    const clock = { value: 0 };
    const limiter = limiterAt(clock);
    for (let i = 0; i < 3; i += 1) limiter.check("1.2.3.4");
    clock.value = 10_001;
    expect(limiter.check("1.2.3.4").allowed).toBe(true);
  });

  it("counts each client separately", () => {
    const clock = { value: 0 };
    const limiter = limiterAt(clock);
    for (let i = 0; i < 3; i += 1) limiter.check("1.2.3.4");
    expect(limiter.check("5.6.7.8").allowed).toBe(true);
  });
});
