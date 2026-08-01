export type AssessmentStage = "START" | "PERSON" | "SERVICE";

export type AssessmentType = {
  key: string;
  name: string;
  description: string;
  stage: AssessmentStage;
  evidenceRequirement: string;
  sourceUrl: string;
};

const CQC_REGS = "https://www.cqc.org.uk/guidance-regulation/providers/regulations-service-providers-and-managers";
const REG9 = `${CQC_REGS}/health-social-care-act/regulation-9`;
const REG12 = `${CQC_REGS}/health-social-care-act/regulation-12`;
const REG15 = `${CQC_REGS}/health-social-care-act/regulation-15`;
const MCA = "https://www.gov.uk/government/publications/mental-capacity-act-code-of-practice";
const HSE_CARE = "https://www.hse.gov.uk/healthservices/sensible-risk-assessment-care-settings.htm";

export const ASSESSMENT_TYPES: AssessmentType[] = [
  {key:"assessment-initial-needs",name:"Initial needs and suitability assessment",description:"First assessment of needs, preferences, outcomes, compatibility, urgent risks and whether the service can safely meet them.",stage:"START",evidenceRequirement:"effective-assessments",sourceUrl:REG9},
  {key:"assessment-consent-authority",name:"Consent and authority checklist",description:"Records separate decisions for care, medicines, information sharing, photographs, access, money and representative involvement—never blanket consent.",stage:"START",evidenceRequirement:"effective-consent",sourceUrl:MCA},
  {key:"assessment-holistic-needs",name:"Holistic needs assessment",description:"Physical, mental, emotional, social, cultural, religious, communication and equality needs with outcomes that matter to the person.",stage:"PERSON",evidenceRequirement:"effective-assessments",sourceUrl:REG9},
  {key:"assessment-moving-handling",name:"Moving and handling assessment",description:"Individual ability, transfers, equipment, staffing, dignity, day/night differences and emergency handling.",stage:"PERSON",evidenceRequirement:"safe-risk-assessments",sourceUrl:"https://www.hse.gov.uk/healthservices/moving-handling/manage-the-risk.htm"},
  {key:"assessment-falls",name:"Falls assessment",description:"Falls history and modifiable factors including mobility, medicines, vision, continence, environment and prevention actions.",stage:"PERSON",evidenceRequirement:"safe-risk-assessments",sourceUrl:"https://www.nice.org.uk/guidance/ng249/chapter/Recommendations/"},
  {key:"assessment-skin-integrity",name:"Skin integrity and pressure-risk assessment",description:"Skin condition, pressure risk, equipment, repositioning, nutrition and escalation supported by clinical judgement.",stage:"PERSON",evidenceRequirement:"safe-risk-assessments",sourceUrl:"https://www.nice.org.uk/guidance/cg179/chapter/Recommendations"},
  {key:"assessment-nutrition-hydration",name:"Nutrition and hydration assessment",description:"Eating, drinking, weight concerns, swallowing, preferences, monitoring and professional referral.",stage:"PERSON",evidenceRequirement:"effective-nutrition",sourceUrl:REG9},
  {key:"assessment-medication-support",name:"Medicines support assessment",description:"What the person manages, agreed assistance, consent, storage, administration, monitoring and escalation.",stage:"PERSON",evidenceRequirement:"safe-medicines-policy",sourceUrl:"https://www.nice.org.uk/guidance/ng67/chapter/Recommendations"},
  {key:"assessment-infection-risk",name:"Individual infection-risk assessment",description:"Susceptibility, symptoms, exposure, additional precautions and proportionate review without unnecessary restriction.",stage:"PERSON",evidenceRequirement:"safe-infection-control",sourceUrl:"https://www.gov.uk/government/publications/infection-prevention-and-control-in-adult-social-care-settings/infection-prevention-and-control-resource-for-adult-social-care"},
  {key:"assessment-home-environment",name:"Home and environmental assessment",description:"Safe access, lighting, flooring, stairs, utilities, fire, smoking, pets, equipment, infection and worker hazards in the care environment.",stage:"PERSON",evidenceRequirement:"safe-risk-assessments",sourceUrl:HSE_CARE},
  {key:"assessment-behaviour-distress",name:"Distress, behaviour and violence-risk assessment",description:"Triggers, communication, unmet needs, de-escalation, staff safety and least-restrictive support.",stage:"PERSON",evidenceRequirement:"safe-risk-assessments",sourceUrl:"https://www.hse.gov.uk/healthservices/violence/do.htm"},
  {key:"assessment-communication",name:"Communication and accessible-information assessment",description:"How the person understands, expresses choices and receives information, including formats, aids, interpreters and reasonable adjustments.",stage:"PERSON",evidenceRequirement:"caring-communication",sourceUrl:"https://www.england.nhs.uk/long-read/accessible-information-standard-requirements-dapb1605/"},
  {key:"assessment-capacity-decision",name:"Decision-specific mental-capacity assessment",description:"Records support offered and the decision-specific functional test; an unwise decision alone does not show lack of capacity.",stage:"PERSON",evidenceRequirement:"effective-consent",sourceUrl:MCA},
  {key:"assessment-restrictive-practice",name:"Restriction and least-restrictive-option assessment",description:"Purpose, necessity, proportionality, alternatives, authority, monitoring and time-limited review of any restriction.",stage:"PERSON",evidenceRequirement:"effective-consent",sourceUrl:MCA},
  {key:"assessment-fire-evacuation",name:"Personal emergency evacuation assessment",description:"Individual evacuation needs, assistance, equipment, staffing and arrangements for foreseeable emergencies.",stage:"PERSON",evidenceRequirement:"safe-risk-assessments",sourceUrl:"https://www.gov.uk/government/publications/fire-safety-risk-assessment-residential-care-premises"},
  {key:"assessment-equipment",name:"Person-specific equipment assessment",description:"Suitability, compatibility, training, maintenance, contingency and safe use of equipment supplied for the person.",stage:"PERSON",evidenceRequirement:"safe-equipment",sourceUrl:REG15},
  {key:"assessment-end-of-life",name:"End-of-life wishes and coordination assessment",description:"What matters to the person, capacity, representation, advance decisions, professional coordination and review.",stage:"PERSON",evidenceRequirement:"responsive-end-life",sourceUrl:REG9},
  {key:"assessment-money-property",name:"Money and property support assessment",description:"Authority, capacity, agreed support, safeguards, records, limits and review where staff assist with money or property.",stage:"PERSON",evidenceRequirement:"safe-safeguarding-log",sourceUrl:REG12},
  {key:"assessment-community-activity",name:"Community access and activity assessment",description:"Positive risk-taking for travel, appointments, activities and community participation with proportionate controls.",stage:"PERSON",evidenceRequirement:"safe-risk-assessments",sourceUrl:HSE_CARE},
  {key:"assessment-safeguarding-vulnerability",name:"Safeguarding vulnerability assessment",description:"Known vulnerabilities, protective factors, warning signs, safety planning and escalation while avoiding labels or automatic restriction.",stage:"PERSON",evidenceRequirement:"safe-safeguarding-log",sourceUrl:CQC_REGS},
  {key:"assessment-equality-impact",name:"Equality impact assessment",description:"Tests whether a policy, service or decision may disadvantage protected groups and records reasonable mitigation.",stage:"SERVICE",evidenceRequirement:"caring-equality",sourceUrl:"https://www.gov.uk/guidance/equality-act-2010-guidance"},
  {key:"assessment-service-change-impact",name:"Service-change impact assessment",description:"Assesses safety, people, workforce, equality, continuity, information and financial effects before a material change.",stage:"SERVICE",evidenceRequirement:"well-risk-register",sourceUrl:REG12},
  {key:"assessment-data-protection-impact",name:"Data protection impact assessment",description:"Screens high-risk personal-data processing and records necessity, proportionality, risks, controls and approval.",stage:"SERVICE",evidenceRequirement:"well-data-protection",sourceUrl:"https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/accountability-and-governance/data-protection-impact-assessments/"},
  {key:"assessment-business-impact",name:"Business impact assessment",description:"Identifies critical services, maximum tolerable disruption, dependencies, recovery priorities and continuity requirements.",stage:"SERVICE",evidenceRequirement:"well-business-continuity",sourceUrl:REG12},
  {key:"assessment-coshh",name:"COSHH assessment",description:"Hazardous substances, exposure routes, people affected, control hierarchy, storage, PPE, emergencies and health surveillance.",stage:"SERVICE",evidenceRequirement:"well-risk-register",sourceUrl:"https://www.hse.gov.uk/coshh/basics/assessment.htm"},
  {key:"assessment-workplace-manual-handling",name:"Workplace manual-handling assessment",description:"Non-person-specific loads, tasks, environment, individual capability, equipment and control measures.",stage:"SERVICE",evidenceRequirement:"well-risk-register",sourceUrl:"https://www.hse.gov.uk/msd/manual-handling/assessment.htm"},
  {key:"assessment-lone-working",name:"Lone-working assessment",description:"Foreseeable violence, travel, communication, welfare checks, escalation, emergencies and worker capability.",stage:"SERVICE",evidenceRequirement:"well-risk-register",sourceUrl:"https://www.hse.gov.uk/lone-working/"},
  {key:"assessment-pregnancy-new-mother",name:"New and expectant mother risk assessment",description:"Individual workplace risks, working conditions, adjustment, review and confidential occupational-health input.",stage:"SERVICE",evidenceRequirement:"well-risk-register",sourceUrl:"https://www.hse.gov.uk/mothers/employer/risk-assessment.htm"},
  {key:"assessment-stress-wellbeing",name:"Work-related stress assessment",description:"Demands, control, support, relationships, role and change with collective and individual controls.",stage:"SERVICE",evidenceRequirement:"well-risk-register",sourceUrl:"https://www.hse.gov.uk/stress/risk-assessment.htm"},
  {key:"assessment-fire-premises",name:"Premises fire-risk assessment record",description:"Responsible-person oversight of hazards, people at risk, precautions, evacuation, action and competent review.",stage:"SERVICE",evidenceRequirement:"well-risk-register",sourceUrl:"https://www.gov.uk/workplace-fire-safety-your-responsibilities/fire-risk-assessments"},
];

export const ASSESSMENT_KEYS = ASSESSMENT_TYPES.map(({key})=>key);
export function assessmentType(key:string){return ASSESSMENT_TYPES.find((item)=>item.key===key)}
export function isAssessmentKey(key:string){return key.startsWith("assessment-")}
export function assessmentPrerequisites(key:string){
  if(key==="assessment-initial-needs")return[];
  if(assessmentType(key)?.stage==="SERVICE")return[];
  const required=[{key:"assessment-initial-needs",label:"Initial assessment"}];
  if(key!=="assessment-consent-authority")required.push({key:"assessment-consent-authority",label:"Consent and authority record"});
  return required;
}
