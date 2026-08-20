import { describe, expect, it } from "vitest";
import {
  buildConfigurationSettings,
  assertIndependentPromotion,
  configurationInputSchema,
  effectiveNotificationPreferences,
  implementationItemUpdateSchema,
  implementationReadiness,
  notificationPreferenceSchema,
  parseConfigurationSettings,
} from "./configurable-delivery";

describe("Phase 10 configurable delivery controls", () => {
  it("always adds the non-disableable safety controls", () => {
    const input = configurationInputSchema.parse({ defaultJurisdiction: "WALES", actionEscalationDays: 3, reviewLeadDays: 21, evidenceExpiryLeadDays: 45, defaultDigestCadence: "WEEKLY", changeSummary: "Prepare the Welsh pilot configuration." });
    const settings = buildConfigurationSettings(input);
    expect(settings.safetyControls).toEqual(expect.objectContaining({ tenantIsolationRequired: true, highRiskClosureEvidenceRequired: true, independentVerificationRequired: true, humanPromotionApprovalRequired: true, assistantUncertaintyEscalationRequired: true }));
    expect(parseConfigurationSettings(settings)).toEqual(settings);
  });

  it("rejects a configuration snapshot with a disabled safety control", () => {
    expect(() => parseConfigurationSettings({ defaultJurisdiction: "ENGLAND", actionEscalationDays: 2, reviewLeadDays: 30, evidenceExpiryLeadDays: 30, defaultDigestCadence: "DAILY", timezone: "Europe/London", schemaVersion: 1, safetyControls: { tenantIsolationRequired: false, highRiskClosureEvidenceRequired: true, independentVerificationRequired: true, humanPromotionApprovalRequired: true, assistantUncertaintyEscalationRequired: true } })).toThrow();
  });

  it("requires evidence for completed or blocked onboarding items", () => {
    expect(implementationItemUpdateSchema.safeParse({ status: "COMPLETE", evidenceNote: "done" }).success).toBe(false);
    expect(implementationItemUpdateSchema.safeParse({ status: "BLOCKED", evidenceNote: "" }).success).toBe(false);
    expect(implementationItemUpdateSchema.safeParse({ status: "COMPLETE", evidenceNote: "Checked by the implementation owner." }).success).toBe(true);
  });

  it("marks readiness only when every required item is complete", () => {
    expect(implementationReadiness([{ required: true, status: "COMPLETE" }, { required: true, status: "IN_PROGRESS" }])).toEqual({ required: 2, complete: 1, percentage: 50, ready: false });
    expect(implementationReadiness([{ required: true, status: "COMPLETE" }, { required: false, status: "NOT_STARTED" }]).ready).toBe(true);
  });

  it("protects immediate critical-safety notifications", () => {
    expect(notificationPreferenceSchema.safeParse({ category: "CRITICAL_SAFETY", enabled: false, cadence: "DAILY" }).success).toBe(false);
    const preferences = effectiveNotificationPreferences([{ category: "CRITICAL_SAFETY", enabled: false, cadence: "WEEKLY" }]);
    expect(preferences[0]).toEqual(expect.objectContaining({ enabled: true, cadence: "IMMEDIATE", locked: true }));
  });

  it("requires a different manager for live promotion", () => {
    expect(() => assertIndependentPromotion("reviewer", "creator", "requester")).not.toThrow();
    expect(() => assertIndependentPromotion("creator", "creator", "requester")).toThrow(/different authorised manager/i);
    expect(() => assertIndependentPromotion("requester", "creator", "requester")).toThrow(/different authorised manager/i);
  });

  it("uses the live non-urgent digest default until a member chooses a preference", () => {
    const preferences = effectiveNotificationPreferences([], "WEEKLY");
    expect(preferences.find((item) => item.category === "WORKFORCE_EXPIRY")?.cadence).toBe("WEEKLY");
    expect(preferences.find((item) => item.category === "ASSISTANT_ESCALATIONS")?.cadence).toBe("IMMEDIATE");
  });
});
