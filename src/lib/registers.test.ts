import { describe, expect, it } from "vitest";
import { collectRegisterData, makeRegisterReference, parseRegisterFields, REGISTER_GROUPS, registerFormExperience, registerGroupKey, registerGuidance, registerStatusLabel } from "./registers";

describe("register framework", () => {
  it("parses configured fields", () => {
    expect(parseRegisterFields([{ key:"outcome", label:"Outcome", type:"textarea" }])).toHaveLength(1);
    expect(parseRegisterFields(null)).toEqual([]);
  });
  it("creates an internal reference", () => expect(makeRegisterReference("data-breaches",new Date("2026-07-25T00:00:00Z"),7)).toBe("DB-20260725-007"));
  it("collects typed data", () => {
    const form=new FormData(); form.set("field_learning","Shared at team meeting"); form.set("field_notified","true");
    expect(collectRegisterData(form,[{key:"learning",label:"Learning",type:"text"},{key:"notified",label:"Notified",type:"boolean"}])).toEqual({learning:"Shared at team meeting",notified:true});
  });
  it("formats status", () => expect(registerStatusLabel("AWAITING_ACTION")).toBe("Awaiting action"));
  it("uses record-specific natural prompts", () => {
    const fall=registerFormExperience("falls","Falls"), notification=registerFormExperience("cqc-notifications","CQC notifications"), candour=registerFormExperience("duty-of-candour","Duty of candour");
    expect(fall.titleLabel).toContain("fall"); expect(fall.summaryPlaceholder).toContain("injury");
    expect(notification.titleLabel).toContain("notifiable event"); expect(notification.saveLabel).toContain("CQC notification");
    expect(candour.detailsIntro).toContain("apology");
  });
  it("groups the expanded catalogue and links authoritative guidance", () => {
    expect(REGISTER_GROUPS).toHaveLength(7);
    expect(registerGroupKey("medicines-reconciliation")).toBe("medicines");
    expect(registerGroupKey("data-subject-rights")).toBe("governance");
    expect(registerGuidance("riddor-reports").sourceUrl).toContain("hse.gov.uk");
    expect(registerGuidance("duty-of-candour").when).toContain("Regulation 20");
  });
});
