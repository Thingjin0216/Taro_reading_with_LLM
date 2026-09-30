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

/** 오래된 키가 무한정 쌓이지 않게 가끔 털어낸다. */
const PRUNE_AT = 5_000;

export function createRateLimiter({ limit, windowMs, now = Date.now }: RateLimiterOptions): RateLimiter {
  const hits = new Map<string, number[]>();

  function recentHits(key: string, current: number): number[] {
    return (hits.get(key) ?? []).filter((at) => current - at < windowMs);
  }

  return {
    check(key) {
      const current = now();

      if (hits.size > PRUNE_AT) {
        for (const [existing, times] of hits) {
          if (recentHits(existing, current).length === 0) {
            hits.delete(existing);
          } else {
            hits.set(existing, times.filter((at) => current - at < windowMs));
          }
        }
      }

      const recent = recentHits(key, current);
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
