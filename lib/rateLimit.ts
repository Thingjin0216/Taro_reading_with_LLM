export interface RateLimiterOptions {
  limit: number;
  windowMs: number;
  now?: () => number;
}

export interface RateLimitResult {
  allowed: boolean;
  /** 거절했을 때만 의미가 있다. 허용된 요청에서는 0. */
  retryAfterSeconds: number;
}

export interface RateLimiter {
  check(key: string): RateLimitResult;
}

export function createRateLimiter({ limit, windowMs, now = Date.now }: RateLimiterOptions): RateLimiter {
  const hits = new Map<string, number[]>();
  let lastPrunedAt = 0;

  /**
   * 오래된 키가 무한정 쌓이지 않게 창 하나가 지날 때마다 한 번만 훑는다.
   * 요청 시각은 늘 뒤에 붙으므로 마지막 값만 보면 그 키가 아직 살아 있는지 안다.
   */
  function prune(current: number) {
    if (current - lastPrunedAt < windowMs) {
      return;
    }
    lastPrunedAt = current;
    for (const [key, times] of hits) {
      if (current - times[times.length - 1] >= windowMs) {
        hits.delete(key);
      }
    }
  }

  return {
    check(key) {
      const current = now();
      prune(current);

      const recent = (hits.get(key) ?? []).filter((at) => current - at < windowMs);
      if (recent.length >= limit) {
        hits.set(key, recent);
        const waitMs = windowMs - (current - recent[0]);
        return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil(waitMs / 1000)) };
      }

      recent.push(current);
      hits.set(key, recent);
      return { allowed: true, retryAfterSeconds: 0 };
    },
  };
}

/**
 * 배포된 데모가 남용되지 않을 정도만 막는다.
 * 서버리스에서는 인스턴스마다 따로 세므로 완벽한 방어는 아니다 — README 참고.
 */
export const apiLimiter = createRateLimiter({ limit: 20, windowMs: 10 * 60 * 1000 });

export function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}
