import{describe,expect,it}from"vitest";import{effectiveActionStatus,makeActionReference,sourcePath,validateActionClosure}from"@/lib/actions";
describe("action workflow",()=>{
  it("creates readable references",()=>expect(makeActionReference(new Date("2026-07-25T00:00:00Z"),4)).toBe("ACT-20260725-004"));
  it("marks active past-due work overdue",()=>expect(effectiveActionStatus("IN_PROGRESS",new Date("2026-07-01"),new Date("2026-07-25"))).toBe("OVERDUE"));
  it("does not mark completed work overdue",()=>expect(effectiveActionStatus("COMPLETED",new Date("2026-07-01"),new Date("2026-07-25"))).toBe("COMPLETED"));
  it("requires evidence or a waiver",()=>expect(()=>validateActionClosure({status:"COMPLETED",evidenceCount:0,closureNote:"Done",verifiedById:"user",verificationDate:new Date()})).toThrow(/evidence/));
  it("allows verified evidence-backed completion",()=>expect(()=>validateActionClosure({status:"COMPLETED",evidenceCount:1,closureNote:"Verified",verifiedById:"user",verificationDate:new Date()})).not.toThrow());
  it("links supported sources",()=>expect(sourcePath("RISK","risk-1")).toBe("/risks/risk-1"));
});
