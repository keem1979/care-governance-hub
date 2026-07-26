import { describe, expect, it } from "vitest";
import {
  answerAssistant,
  ASSISTANT_TOPICS,
  MODULE_CONTEXTS,
} from "@/lib/assistant-knowledge";
import { PERMISSIONS } from "@/lib/permissions";

const all = Object.values(PERMISSIONS);

describe("Abi governance assistant", () => {
  it("covers every main navigation module", () => {
    expect(ASSISTANT_TOPICS.map((item) => item.href)).toEqual(expect.arrayContaining(["/dashboard","/policies","/evidence","/audits","/registers","/risks","/actions","/meetings","/calendar","/kpis","/inspection","/templates","/reports","/activity","/settings"]));
  });

  it("has health and social care and CQC context for every module", () => {
    for (const topic of ASSISTANT_TOPICS) {
      expect(MODULE_CONTEXTS[topic.href]?.hsc).toBeTruthy();
      expect(MODULE_CONTEXTS[topic.href]?.cqc).toBeTruthy();
    }
  });

  it("introduces herself as Abi", () => {
    expect(answerAssistant("Hello", all).answer).toContain("I’m Abi");
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
    const answer = answerAssistant(
      "How does this page work?",
      all,
      "/kpis/entry",
    ).answer;
    expect(answer).toContain("KPI Dashboard");
    expect(answer).toContain("In health and social care");
    expect(answer).toContain("For CQC inspection and assessment");
  });

  it("explains a module in health and social care and CQC terms", () => {
    const answer = answerAssistant(
      "Why does the risk register matter for CQC inspection?",
      all,
    ).answer;
    expect(answer).toContain("possible harm");
    expect(answer).toContain("safe systems");
    expect(answer).toContain("Inspectors may test");
  });

  it("explains the five CQC key questions and current framework transition", () => {
    const answer = answerAssistant(
      "What are the five CQC key questions?",
      all,
    ).answer;
    expect(answer).toContain("safe, effective, caring, responsive");
    expect(answer).toContain("well-led");
    expect(answer).toContain("piloting a draft sector-specific");
    expect(answer).toContain("does not predict or award a CQC rating");
  });

  it("explains all six CQC evidence categories", () => {
    const answer = answerAssistant(
      "What evidence categories does CQC use?",
      all,
    ).answer;
    expect(answer).toContain("people’s experience");
    expect(answer).toContain("feedback from staff and leaders");
    expect(answer).toContain("feedback from partners");
    expect(answer).toContain("observation");
    expect(answer).toContain("processes");
    expect(answer).toContain("outcomes");
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
    expect(reply.answer).toContain("does not currently have access");
  });
});
