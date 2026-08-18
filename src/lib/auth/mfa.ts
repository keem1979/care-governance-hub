import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const TOTP_PERIOD_SECONDS = 30;

function base32Encode(bytes: Uint8Array): string {
  let bits = "";
  for (const byte of bytes) bits += byte.toString(2).padStart(8, "0");
  let output = "";
  for (let index = 0; index < bits.length; index += 5) {
    output += BASE32_ALPHABET[Number.parseInt(bits.slice(index, index + 5).padEnd(5, "0"), 2)];
  }
  return output;
}

function base32Decode(value: string): Buffer {
  const normalised = value.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = "";
  for (const character of normalised) {
    const index = BASE32_ALPHABET.indexOf(character);
    if (index < 0) throw new Error("Invalid MFA secret.");
    bits += index.toString(2).padStart(5, "0");
  }
  const bytes: number[] = [];
  for (let index = 0; index + 8 <= bits.length; index += 8) {
    bytes.push(Number.parseInt(bits.slice(index, index + 8), 2));
  }
  return Buffer.from(bytes);
}

function encryptionKey(keyMaterial: string): Buffer {
  return createHash("sha256").update(`qcgms:mfa-encryption:${keyMaterial}`).digest();
}

export function generateMfaSecret(): string {
  return base32Encode(randomBytes(20));
}

export function buildOtpAuthUri(input: {
  secret: string;
  email: string;
  organisationName: string;
}): string {
  const issuer = "QCGMS";
  const label = `${issuer}:${input.organisationName} (${input.email})`;
  const params = new URLSearchParams({
    secret: input.secret,
    issuer,
    algorithm: "SHA1",
    digits: "6",
    period: String(TOTP_PERIOD_SECONDS),
  });
  return `otpauth://totp/${encodeURIComponent(label)}?${params.toString()}`;
}

export function encryptMfaSecret(secret: string, keyMaterial: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(keyMaterial), iv);
  const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv.toString("base64url"), tag.toString("base64url"), encrypted.toString("base64url")].join(":");
}

export function decryptMfaSecret(ciphertext: string, keyMaterial: string): string {
  const [version, iv, tag, encrypted] = ciphertext.split(":");
  if (version !== "v1" || !iv || !tag || !encrypted) throw new Error("Unsupported MFA secret format.");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(keyMaterial), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(encrypted, "base64url")), decipher.final()]).toString("utf8");
}

export function generateTotp(secret: string, now = Date.now()): string {
  const counter = Math.floor(now / 1000 / TOTP_PERIOD_SECONDS);
  const message = Buffer.alloc(8);
  message.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac("sha1", base32Decode(secret)).update(message).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary = ((digest[offset] & 0x7f) << 24) | ((digest[offset + 1] & 0xff) << 16) | ((digest[offset + 2] & 0xff) << 8) | (digest[offset + 3] & 0xff);
  return String(binary % 1_000_000).padStart(6, "0");
}

export function verifyTotp(secret: string, code: string, now = Date.now()): boolean {
  const candidate = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(candidate)) return false;
  return [-1, 0, 1].some((offset) => {
    const expected = generateTotp(secret, now + offset * TOTP_PERIOD_SECONDS * 1000);
    return timingSafeEqual(Buffer.from(candidate), Buffer.from(expected));
  });
}

function normaliseRecoveryCode(value: string): string {
  return value.toUpperCase().replace(/[^A-Z2-7]/g, "");
}

export function hashRecoveryCode(code: string, keyMaterial: string): string {
  return createHmac("sha256", encryptionKey(keyMaterial)).update(`qcgms:mfa-recovery:${normaliseRecoveryCode(code)}`).digest("hex");
}

export function generateRecoveryCodes(keyMaterial: string, count = 8): { codes: string[]; hashes: string[] } {
  const codes = Array.from({ length: count }, () => {
    const raw = base32Encode(randomBytes(8)).slice(0, 12);
    return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8)}`;
  });
  return { codes, hashes: codes.map((code) => hashRecoveryCode(code, keyMaterial)) };
}

export function matchRecoveryCode(code: string, hashes: readonly string[], keyMaterial: string): string | null {
  const candidate = Buffer.from(hashRecoveryCode(code, keyMaterial), "hex");
  return hashes.find((hash) => {
    const stored = Buffer.from(hash, "hex");
    return stored.length === candidate.length && timingSafeEqual(stored, candidate);
  }) ?? null;
}
