import {describe,expect,it} from "vitest";
import {ASSESSMENT_TYPES,assessmentType,isAssessmentKey} from "./assessments";

describe("assessment catalogue",()=>{
  it("starts with initial assessment and decision-specific consent",()=>{
    expect(ASSESSMENT_TYPES.slice(0,2).map(({key})=>key)).toEqual(["assessment-initial-needs","assessment-consent-authority"]);
    expect(ASSESSMENT_TYPES.filter(({stage})=>stage==="START")).toHaveLength(2);
  });
  it("covers person-centred and service-impact assessments",()=>{
    expect(ASSESSMENT_TYPES).toHaveLength(30);
    expect(assessmentType("assessment-home-environment")?.stage).toBe("PERSON");
    expect(assessmentType("assessment-equality-impact")?.stage).toBe("SERVICE");
  });
  it("recognises assessment keys",()=>{
    expect(isAssessmentKey("assessment-falls")).toBe(true);
    expect(isAssessmentKey("falls")).toBe(false);
  });
});
