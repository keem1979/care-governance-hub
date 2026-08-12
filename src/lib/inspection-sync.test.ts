import { describe, expect, it } from "vitest";
import { evidenceCategoriesFor, evidenceRequirementKeys, policyRequirementKeys } from "@/lib/inspection-sync";

describe("inspection cross-module synchronisation",()=>{
  it("maps every automatic module feed to inspection requirements",()=>{
    const base={title:"Record",category:"Governance",tags:[] as string[],relatedRecordId:"1"};
    expect(evidenceRequirementKeys({...base,relatedModule:"Action"})).toContain("well-actions");
    expect(evidenceRequirementKeys({...base,relatedModule:"GovernanceMeeting"})).toContain("well-governance-minutes");
    expect(evidenceRequirementKeys({...base,relatedModule:"Risk"})).toContain("well-risk-register");
    expect(evidenceRequirementKeys({...base,relatedModule:"WorkforceTrainingMatrix"})).toEqual(expect.arrayContaining(["effective-training-matrix","effective-competency-matrix"]));
    expect(evidenceRequirementKeys({...base,relatedModule:"EvidenceRequirement",relatedRecordId:"well-kpis"})).toContain("well-kpis");
  });
  it("honours explicit requirement tags and maps register and audit feeds",()=>{
    const base={title:"Record",category:"Audits",relatedRecordId:"1"};
    expect(evidenceRequirementKeys({...base,relatedModule:"Audit",tags:["audit:medicines-audit"]})).toEqual(expect.arrayContaining(["safe-medicines-policy","safe-medication-errors"]));
    expect(evidenceRequirementKeys({...base,relatedModule:"RegisterEntry",tags:["register:complaints"]})).toEqual(["responsive-complaints"]);
    expect(evidenceRequirementKeys({...base,relatedModule:"Other",tags:["requirement:caring-feedback"]})).toEqual(["caring-feedback"]);
  });
  it("maps policy studio records and the six evidence-category concepts",()=>{
    expect(policyRequirementKeys("safeguarding")).toContain("safe-safeguarding-policy");
    expect(evidenceCategoriesFor({title:"People survey outcome",category:"Service-user feedback",tags:[],relatedModule:"RegisterEntry",relatedRecordId:"1"})).toEqual(expect.arrayContaining(["PEOPLES_EXPERIENCE","PROCESSES","OUTCOMES"]));
    expect(evidenceCategoriesFor({title:"Staff observation audit",category:"Training",tags:[],relatedModule:"Audit",relatedRecordId:"1"})).toEqual(expect.arrayContaining(["STAFF_AND_LEADER_FEEDBACK","OBSERVATION"]));
  });
});
