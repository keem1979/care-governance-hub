import {describe,expect,it} from "vitest";
import {safeguardingAssuranceReadiness,safeguardingClosureAuthority,safeguardingStage} from "@/lib/safeguarding-assurance";

const readyCase={status:"READY_FOR_ASSURANCE",safetyPosition:"SAFE_NOW",immediateControl:null,concernCategories:["Neglect / acts of omission"],triageRationale:"Manager triaged against the provider pathway.",referralDecision:"NOT_REQUIRED",referredTo:[],referralDate:null,externalResponseStatus:"No external response required.",investigationQuestion:"What occurred?",investigationSummary:"Evidence was reviewed proportionately.",findings:"The concern was not substantiated.",outcome:"Protection plan remains appropriate.",externalDependencies:"None outstanding.",learning:"Handover wording was clarified.",affectedRecordsReviewed:"Care plan and risk assessment reviewed.",recurrenceReview:"No controlled recurrence identified.",noFurtherActionRationale:"No additional improvement required.",investigatorId:"investigator"};

describe("safeguarding assurance",()=>{
  it("keeps completion separate from effectiveness",()=>{const result=safeguardingAssuranceReadiness({riskLevel:"HIGH",caseRecord:readyCase,actions:[{closedAt:new Date(),effectivenessOutcome:"NOT_EFFECTIVE"}],evidenceCount:1});expect(result.state).not.toBe("READY_FOR_ASSURANCE");expect(result.outstanding.map(x=>x.key)).toContain("effectiveness");});
  it("blocks assurance while immediate safety is unresolved",()=>{const result=safeguardingAssuranceReadiness({riskLevel:"LOW",caseRecord:{...readyCase,safetyPosition:"UNRESOLVED_IMMEDIATE_RISK"},actions:[],evidenceCount:0});expect(result.outstanding.map(x=>x.key)).toContain("current-safety");});
  it("allows proportionate low closure without separate evidence",()=>expect(safeguardingAssuranceReadiness({riskLevel:"LOW",caseRecord:readyCase,actions:[],evidenceCount:0}).state).toBe("READY_FOR_ASSURANCE"));
  it("requires independent Critical authority",()=>expect(safeguardingClosureAuthority({riskLevel:"CRITICAL",actorRoleKey:"registered-manager",actorId:"same",createdById:"same",investigatorId:"other"}).allowed).toBe(false));
  it("shows reopening before ordinary stages",()=>expect(safeguardingStage({closed:false,reopened:true,caseStatus:"TRIAGED",openActions:0,ready:false})).toBe("REOPENED"));
});
