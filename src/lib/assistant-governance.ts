export function redactAssistantText(value: string, maximum = 360) {
  return value
    .normalize("NFKC")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email redacted]")
    .replace(/\b(?:CLI|STF|CP|RISK|ACT)-\d{2,}-\d{2,}\b/gi, "[record reference redacted]")
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi, "[identifier redacted]")
    .replace(/(?:\+?44\s?\d|0\d)(?:[\s().-]*\d){8,10}/g, "[phone redacted]")
    .replace(/\b\d{10,12}\b/g, "[identifier redacted]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maximum);
}

export async function assistantDigest(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value.normalize("NFKC")));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function assistantEscalationReference(sequence: number, now = new Date()) {
  return `ABI-${now.getUTCFullYear()}-${String(sequence).padStart(5, "0")}`;
}

export function assistantClassificationLabel(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/^\w/, (letter) => letter.toUpperCase());
}
