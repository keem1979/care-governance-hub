import { describe, expect, it } from "vitest";
import { evaluateLoginAttempt, hashRateLimitKey } from "@/lib/auth/rate-limit";

describe("login rate limiting", () => {
  it("blocks attempts beyond the configured limit", () => {
    const resetAt = new Date(61_000);
    expect(evaluateLoginAttempt(
      { attempts: 2, resetAt },
      { maxAttempts: 2, windowMs: 60_000, now: new Date(1_000) },
    )).toEqual({ allowed: false, attempts: 3, resetAt, retryAfterSeconds: 60 });
  });

  it("starts a new durable window after expiry", () => {
    expect(evaluateLoginAttempt(
      { attempts: 9, resetAt: new Date(2_000) },
      { maxAttempts: 5, windowMs: 60_000, now: new Date(2_001) },
    )).toEqual({ allowed: true, attempts: 1, resetAt: new Date(62_001), retryAfterSeconds: 0 });
  });

  it("stores only a keyed fingerprint, not the email or address", () => {
    const fingerprint = hashRateLimitKey(
      "192.0.2.10:person@example.test",
      "test-secret-that-is-at-least-thirty-two-characters",
    );
    expect(fingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(fingerprint).not.toContain("person@example.test");
  });
});
