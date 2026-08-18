import { describe, expect, it } from "vitest";
import { compareCarePlanSnapshots, reviewToCarePlanSnapshot, validateCarePlanAssurance } from "@/lib/care-plans";

describe("care plan version control", () => {
  it("creates only changed section proposals", () => {
    const changes = compareCarePlanSnapshots(
      { aboutMe: { importantToMe: "Family" }, communication: { language: "English" } },
      { aboutMe: { importantToMe: "Family and church" }, communication: { language: "English" } },
      { reason: "Review", riskImpact: "MEDIUM", source: "CPR-1" },
    );
    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({ sectionKey: "aboutMe", changeType: "AMENDED" });
  });

  it("maps review decisions onto shared care-plan sections", () => {
    const next = reviewToCarePlanSnapshot({ aboutMe: { ownWords: "Old" } }, { importantNow: "My family", whatIWantStaffToKnow: "Please explain first" });
    expect(next.aboutMe).toMatchObject({ importantToMe: "My family", ownWords: "Please explain first" });
  });

  it("blocks ordinary publication when assurance remains partial", () => {
    const assurance = Object.fromEntries([
      "Person involved", "Consent / authority clear", "Needs assessed", "Preferences recorded",
      "Outcomes identified", "Risks assessed", "Controls documented", "Medication responsibilities clear",
      "Clinical escalation clear", "Safeguarding considered", "Care package sufficient",
      "Required competencies identified", "Professional advice reflected", "Evidence linked",
      "Staff implementation ready", "Review date assigned",
    ].map((key) => [key, key === "Evidence linked" ? "PARTIAL" : "MET"]));
    expect(() => validateCarePlanAssurance({ approval: { assurance } }, "APPROVE AND PUBLISH")).toThrow(/approve with actions/i);
  });
});
