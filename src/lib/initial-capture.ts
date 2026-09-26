import { collectRegisterData, type RegisterField } from "@/lib/registers";

export const INITIAL_CAPTURE_KEYS = ["incidents", "complaints", "safeguarding"] as const;
export type InitialCaptureKey = (typeof INITIAL_CAPTURE_KEYS)[number];

const REQUIRED_AT_CAPTURE: Record<InitialCaptureKey, readonly string[]> = {
  incidents: ["incidentType", "harmLevel"],
  complaints: ["immediateSafetyConcern"],
  safeguarding: ["safetyPosition"],
};

export function isInitialCaptureKey(key: string): key is InitialCaptureKey {
  return INITIAL_CAPTURE_KEYS.includes(key as InitialCaptureKey);
}

export function deriveInitialCaptureTitle(key: InitialCaptureKey, summary: string): string {
  const subject = { incidents: "Incident", complaints: "Complaint", safeguarding: "Safeguarding concern" }[key];
  const sentence = summary.trim().replace(/\s+/g, " ").slice(0, 72).replace(/[\s,;:.!?-]+$/, "");
  return `${subject}: ${sentence}`;
}

export function collectInitialCaptureData(key: InitialCaptureKey, form: FormData, fields: RegisterField[]) {
  const required = new Set(REQUIRED_AT_CAPTURE[key]);
  for (const fieldKey of required) {
    if (!fields.some((field) => field.key === fieldKey && field.type === "select")) {
      throw new Error("The published capture fields are incomplete.");
    }
  }
  const data = collectRegisterData(form, fields.map((field) => ({ ...field, required: required.has(field.key) })));
  const response = String(data.immediateResponse ?? data.immediateSafetyResponse ?? "").trim();
  if (key === "incidents" && ["Moderate harm", "Severe harm", "Death"].includes(String(data.harmLevel)) && !response) {
    throw new Error("Record the immediate care or escalation for this known harm.");
  }
  if (key === "complaints" && ["Immediate safety concern controlled", "Immediate safety concern requiring action"].includes(String(data.immediateSafetyConcern)) && !response) {
    throw new Error("Record the immediate response or action needed for this safety concern.");
  }
  if (key === "safeguarding" && ["Immediate risk controlled", "Immediate risk unresolved"].includes(String(data.safetyPosition)) && !response) {
    throw new Error("Record the immediate protection or escalation for this safeguarding risk.");
  }
  return data;
}
