import { describe, expect, it } from "vitest";
import { signSession, verifySessionToken } from "@/lib/auth/session";

const secret = "test-secret-that-is-at-least-thirty-two-characters";

describe("signed sessions", () => {
  it("verifies an active signed session", async () => {
    const expiresAt = Date.now() + 60_000;
    const token = await signSession(
      { userId: "user-1", sessionId: "session-1", expiresAt },
      secret,
    );
    await expect(verifySessionToken(token, secret)).resolves.toMatchObject({
      userId: "user-1",
      sessionId: "session-1",
    });
  });

  it("rejects an expired session", async () => {
    const now = Date.now();
    const token = await signSession(
      { userId: "user-1", sessionId: "session-1", expiresAt: now + 1_000 },
      secret,
    );
    await expect(
      verifySessionToken(token, secret, now + 2_000),
    ).resolves.toBeNull();
  });

  it("rejects a token signed with another secret", async () => {
    const token = await signSession(
      {
        userId: "user-1",
        sessionId: "session-1",
        expiresAt: Date.now() + 60_000,
      },
      secret,
    );
    await expect(
      verifySessionToken(
        token,
        "another-secret-that-is-at-least-thirty-two-characters",
      ),
    ).resolves.toBeNull();
  });
});
