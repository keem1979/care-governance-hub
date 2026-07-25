import { describe, expect, it } from "vitest";
import { answerAssistant, ASSISTANT_TOPICS } from "@/lib/assistant-knowledge";
import { PERMISSIONS } from "@/lib/permissions";

const all = Object.values(PERMISSIONS);

describe("Care Governance Assistant", () => {
  it("covers every main navigation module", () => {
    expect(ASSISTANT_TOPICS.map((item) => item.href)).toEqual(expect.arrayContaining(["/dashboard","/policies","/evidence","/audits","/registers","/risks","/actions","/meetings","/calendar","/kpis","/inspection","/templates","/reports","/activity","/settings"]));
  });

  it("answers workflow questions with the correct destination", () => {
    const reply = answerAssistant("How do I add evidence?", all);
    expect(reply.answer).toContain("Evidence Library");
    expect(reply.links[0]).toEqual({ label: "Add evidence", href: "/evidence/new" });
  });

  it("navigates only for explicit navigation requests", () => {
    expect(answerAssistant("Open the risk register", all).navigate).toBe(true);
    expect(answerAssistant("How does the risk register work?", all).navigate).toBe(false);
  });

  it("uses the current route when asked about this page", () => {
    expect(answerAssistant("How does this page work?", all, "/kpis/entry").answer).toContain("KPI Dashboard");
  });

  it("routes named report requests to the matching report", () => {
    const reply = answerAssistant("Take me to the complaints report", all);
    expect(reply.navigate).toBe(true);
    expect(reply.links[0]).toEqual({ label: "Complaints report", href: "/reports/complaints" });
  });

  it("does not link users to unauthorised modules", () => {
    const reply = answerAssistant("Take me to Settings", [PERMISSIONS.GOVERNANCE_VIEW]);
    expect(reply.navigate).toBe(false);
    expect(reply.links).toEqual([]);
    expect(reply.answer).toContain("does not include access");
  });
});
