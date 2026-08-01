import{describe,expect,it}from"vitest";import{actionDaysRemaining,actionProgressValue,actionReadiness,effectiveActionStatus,makeActionReference,sourcePath,validateActionClosure}from"@/lib/actions";
describe("action workflow",()=>{
  it("creates readable references",()=>expect(makeActionReference(new Date("2026-07-25T00:00:00Z"),4)).toBe("ACT-20260725-004"));
  it("marks active past-due work overdue",()=>expect(effectiveActionStatus("IN_PROGRESS",new Date("2026-07-01"),new Date("2026-07-25"))).toBe("OVERDUE"));
  it("does not mark completed work overdue",()=>expect(effectiveActionStatus("COMPLETED",new Date("2026-07-01"),new Date("2026-07-25"))).toBe("COMPLETED"));
  it("requires evidence or a waiver",()=>expect(()=>validateActionClosure({status:"COMPLETED",evidenceCount:0,closureNote:"Done",verifiedById:"user",verificationDate:new Date()})).toThrow(/evidence/));
  it("allows verified evidence-backed completion",()=>expect(()=>validateActionClosure({status:"COMPLETED",evidenceCount:1,closureNote:"Verified",verifiedById:"user",verificationDate:new Date()})).not.toThrow());
  it("links supported sources",()=>expect(sourcePath("RISK","risk-1")).toBe("/risks/risk-1"));
  it("prefers the validated stored source link",()=>expect(sourcePath("REGISTER","entry-1","/registers/complaints/entry-1")).toBe("/registers/complaints/entry-1"));
  it("calculates remaining days",()=>expect(actionDaysRemaining("2026-07-28",new Date("2026-07-25T00:00:00Z"))).toBe(3));
  it("sets completed progress to 100",()=>expect(actionProgressValue("COMPLETED",40)).toBe(100));
  it("identifies an evidence gap before closure",()=>expect(actionReadiness({status:"IN_PROGRESS",progressPercent:100,evidenceRequired:true,evidenceCount:0})).toBe("NEEDS_EVIDENCE"));
  it("identifies independently verified readiness",()=>expect(actionReadiness({status:"AWAITING_VERIFICATION",progressPercent:100,evidenceRequired:true,evidenceCount:1,verifiedById:"manager",verificationDate:new Date()})).toBe("READY_TO_CLOSE"));
});
