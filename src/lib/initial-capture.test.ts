import { describe, expect, it } from "vitest";
import { collectInitialCaptureData, deriveInitialCaptureTitle } from "./initial-capture";
import type { RegisterField } from "./registers";

const incidentFields: RegisterField[] = [
  { key: "incidentType", label: "Incident type", type: "select", required: true, options: ["Care delivery"] },
  { key: "harmLevel", label: "Verified harm position", type: "select", required: true, options: ["Unknown / evidence required", "Severe harm"] },
  { key: "immediateResponse", label: "Immediate care", type: "textarea", required: true },
  { key: "cqcNotification", label: "CQC notification decision", type: "select", required: true, options: ["Awaiting decision / evidence"] },
];

describe("first capture validation", () => {
  it("derives a neutral title from the account", () => {
    expect(deriveInitialCaptureTitle("incidents", "  Care visit   was delayed.  ")).toBe("Incident: Care visit was delayed");
  });
  it("allows an Incident to be recorded while later professional decisions remain blank", () => {
    const form = new FormData();
    form.set("field_incidentType", "Care delivery");
    form.set("field_harmLevel", "Unknown / evidence required");
    expect(collectInitialCaptureData("incidents", form, incidentFields)).toEqual({
      incidentType: "Care delivery", harmLevel: "Unknown / evidence required", immediateResponse: "", cqcNotification: "",
    });
  });
  it("requires an actual response for known severe harm and rejects invented options", () => {
    const form = new FormData();
    form.set("field_incidentType", "Care delivery");
    form.set("field_harmLevel", "Severe harm");
    expect(() => collectInitialCaptureData("incidents", form, incidentFields)).toThrow("immediate care");
    form.set("field_immediateResponse", "Emergency response recorded.");
    form.set("field_incidentType", "Unsupported");
    expect(() => collectInitialCaptureData("incidents", form, incidentFields)).toThrow("valid incident type");
  });
  it("keeps Safeguarding safety explicit and requires a note when immediate risk remains", () => {
    const fields: RegisterField[] = [
      { key: "safetyPosition", label: "Is the person safe now?", type: "select", required: true, options: ["Unknown / evidence required", "Immediate risk unresolved"] },
      { key: "immediateResponse", label: "Immediate action", type: "textarea" },
    ];
    const form = new FormData();
    expect(() => collectInitialCaptureData("safeguarding", form, fields)).toThrow("Complete is the person safe now");
    form.set("field_safetyPosition", "Immediate risk unresolved");
    expect(() => collectInitialCaptureData("safeguarding", form, fields)).toThrow("immediate protection");
  });
});
