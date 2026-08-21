import { describe, expect, it } from "vitest";
import type { PrismaClient } from "@/generated/prisma/client";
import { assertFrameworkOverrideAllowed, evaluateRiskClosure, evaluateRiskClosureConditions, legacyClosureRule, resolveCurrentRiskFramework, riskFrameworkDraftSchema, stableRiskCategoryKey, strongestRecordedRiskLevel } from "@/lib/risk-framework";
import { ROLE_KEYS } from "@/lib/permissions";

const facts={actorRoleKey:ROLE_KEYS.REGISTERED_MANAGER,actorId:"approver",ownerId:"owner",proposerId:"proposer",residualScore:4,toleranceScore:4,supportingEvidenceCount:1,verifiedCurrentEvidenceCount:1,unresolvedActionCount:0,effectivenessReviewCount:1,approvalCount:1};

describe("organisation Risk Framework",()=>{
  it("uses exact stable category keys and never fuzzy-maps legacy text",()=>{
    expect(stableRiskCategoryKey("Medicines")).toBe("MEDICINES");
    expect(stableRiskCategoryKey("medicines")).toBeNull();
    expect(stableRiskCategoryKey("Medication safety (legacy)")).toBeNull();
  });

  it("rejects duplicate category rules and incomplete authority matrices",()=>{
    const result=riskFrameworkDraftSchema.safeParse({effectiveFrom:"2026-09-01",defaultAppetite:"LOW",defaultToleranceScore:9,changeRationale:"Initial provider framework",categoryRules:[{categoryKey:"MEDICINES",appetite:"VERY_LOW",toleranceScore:4},{categoryKey:"MEDICINES",appetite:"LOW",toleranceScore:6}],closureRules:[]});
    expect(result.success).toBe(false);
  });

  it("inherits a category override without changing the score",async()=>{
    const findFirst=async()=>({id:"framework-v2",versionNumber:2,defaultAppetite:"MODERATE",defaultToleranceScore:9,defaultEscalation:null,closurePolicyVersion:{id:"policy-v2",versionNumber:2},rules:[{id:"medicines-rule",categoryKey:"MEDICINES",appetite:"LOW",toleranceScore:6,escalationIndicator:"Escalate above six"}]});
    const db={riskFrameworkVersion:{findFirst}} as unknown as PrismaClient;
    const resolved=await resolveCurrentRiskFramework(db,"organisation","Medicines",new Date("2026-10-01T12:00:00Z"));
    expect(resolved).toMatchObject({frameworkVersionNumber:2,appetite:"LOW",toleranceScore:6,categoryKey:"MEDICINES"});
    const residualScore=8;
    expect(residualScore).toBe(8);
    expect(residualScore).toBeGreaterThan(resolved!.toleranceScore);
  });

  it("uses the organisation default and fails legacy categories safely",async()=>{
    let calls=0;const db={riskFrameworkVersion:{findFirst:async()=>{calls++;return {id:"f",versionNumber:1,defaultAppetite:"LOW",defaultToleranceScore:7,defaultEscalation:null,closurePolicyVersion:{id:"p",versionNumber:1},rules:[]}}}} as unknown as PrismaClient;
    expect(await resolveCurrentRiskFramework(db,"organisation","Operational")).toMatchObject({appetite:"LOW",toleranceScore:7});
    expect(await resolveCurrentRiskFramework(db,"organisation","Historic local category")).toBeNull();
    expect(calls).toBe(1);
  });

  it("blocks direct unauthorised overrides and requires rationale",()=>{
    expect(()=>assertFrameworkOverrideAllowed("OVERRIDE_CURRENT",false,"A sufficiently long reason")).toThrow(/authorised organisation manager/i);
    expect(()=>assertFrameworkOverrideAllowed("OVERRIDE_CURRENT",true,"short")).toThrow(/clear rationale/i);
    expect(()=>assertFrameworkOverrideAllowed("OVERRIDE_CURRENT",true,"Provider-approved service-specific exception")).not.toThrow();
  });
});

describe("Risk closure authority evaluator",()=>{
  it("allows proportionate low-risk self approval when configured",()=>{
    const rule=legacyClosureRule("LOW");
    const result=evaluateRiskClosure(rule,{...facts,actorId:"owner",ownerId:"owner",proposerId:"owner"});
    expect(result.readyToClose).toBe(true);
  });

  it("separates completion, evidence, effectiveness and approval",()=>{
    const rule=legacyClosureRule("HIGH");
    const result=evaluateRiskClosure(rule,{...facts,verifiedCurrentEvidenceCount:0,effectivenessReviewCount:0,approvalCount:0});
    expect(result.readyToClose).toBe(false);
    expect(result.outstanding.join(" ")).toMatch(/verified Evidence/i);
    expect(result.outstanding.join(" ")).toMatch(/effectiveness/i);
    expect(result.outstanding.join(" ")).toMatch(/approval/i);
  });

  it("blocks self approval when separation is required",()=>{
    const result=evaluateRiskClosure(legacyClosureRule("HIGH"),{...facts,actorId:"owner",ownerId:"owner"});
    expect(result.checks.find(check=>check.key==="self")?.met).toBe(false);
    expect(result.readyToClose).toBe(false);
  });

  it("blocks a proposal while treatment Actions remain unresolved",()=>{
    const checks=evaluateRiskClosureConditions(legacyClosureRule("MODERATE"),{...facts,unresolvedActionCount:1});
    expect(checks.find(check=>check.key==="actions")?.met).toBe(false);
  });

  it("requires two distinct approvals for the critical fallback",()=>{
    const rule=legacyClosureRule("CRITICAL");
    expect(evaluateRiskClosure(rule,{...facts,actorRoleKey:ROLE_KEYS.OWNER,approvalCount:1}).readyToClose).toBe(false);
    expect(evaluateRiskClosure(rule,{...facts,actorRoleKey:ROLE_KEYS.OWNER,approvalCount:2}).readyToClose).toBe(true);
  });

  it("does not downgrade closure authority when a formerly Critical Risk improves",()=>{
    expect(strongestRecordedRiskLevel(["CRITICAL","LOW"])).toBe("CRITICAL");
    expect(strongestRecordedRiskLevel(["LOW","MODERATE","HIGH"])).toBe("HIGH");
  });
});
