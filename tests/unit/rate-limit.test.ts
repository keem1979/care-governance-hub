import { beforeEach, describe, expect, it } from "vitest";
import {
  consumeLoginAttempt,
  resetRateLimitForTests,
} from "@/lib/auth/rate-limit";

describe("login rate limiting", () => {
  beforeEach(resetRateLimitForTests);

  it("blocks attempts beyond the configured limit", () => {
    const options = { maxAttempts: 2, windowMs: 60_000, now: 1_000 };
    expect(consumeLoginAttempt("key", options).allowed).toBe(true);
    expect(consumeLoginAttempt("key", options).allowed).toBe(true);
    expect(consumeLoginAttempt("key", options)).toEqual({
      allowed: false,
      retryAfterSeconds: 60,
    });
  });

  it("starts a new window after expiry", () => {
    consumeLoginAttempt("key", {
      maxAttempts: 1,
      windowMs: 1_000,
      now: 1_000,
    });
    expect(
      consumeLoginAttempt("key", {
        maxAttempts: 1,
        windowMs: 1_000,
        now: 2_001,
      }).allowed,
    ).toBe(true);
  });
});
