import { describe, expect, it } from "vitest";
import { loginSchema } from "@/lib/auth/validation";

describe("login validation", () => {
  it("normalises a valid email address", () => {
    const result = loginSchema.parse({
      email: " OWNER@MEADOWVIEW.DEMO ",
      password: "DemoCare!2026",
    });
    expect(result.email).toBe("owner@meadowview.demo");
  });

  it("rejects malformed credentials", () => {
    expect(
      loginSchema.safeParse({ email: "not-an-email", password: "short" })
        .success,
    ).toBe(false);
  });
});
