import { describe, expect, it } from "vitest";
import {
  decryptMfaSecret,
  encryptMfaSecret,
  generateRecoveryCodes,
  generateTotp,
  matchRecoveryCode,
  verifyTotp,
} from "@/lib/auth/mfa";

const key = "test-key-material-that-is-at-least-thirty-two-characters";
const secret = "JBSWY3DPEHPK3PXP";

describe("multi-factor authentication", () => {
  it("encrypts MFA secrets at rest", () => {
    const encrypted = encryptMfaSecret(secret, key);
    expect(encrypted).not.toContain(secret);
    expect(decryptMfaSecret(encrypted, key)).toBe(secret);
  });

  it("accepts current TOTP codes and rejects other codes", () => {
    const now = 1_800_000_000_000;
    const code = generateTotp(secret, now);
    expect(verifyTotp(secret, code, now)).toBe(true);
    expect(verifyTotp(secret, code === "000000" ? "111111" : "000000", now)).toBe(false);
  });

  it("hashes recovery codes and matches a saved code", () => {
    const recovery = generateRecoveryCodes(key, 2);
    expect(recovery.hashes[0]).not.toContain(recovery.codes[0]);
    expect(matchRecoveryCode(recovery.codes[0], recovery.hashes, key)).toBe(recovery.hashes[0]);
    expect(matchRecoveryCode("AAAA-BBBB-CCCC", recovery.hashes, key)).toBeNull();
  });
});
