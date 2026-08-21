export type EvidenceCurrentnessModeValue =
  | "HISTORICAL_NON_EXPIRING"
  | "EXPIRY_BASED"
  | "REVIEW_BASED"
  | "SUPERSESSION_BASED"
  | "CURRENT_SOURCE";

export type CoreEvidenceType = {
  key: string;
  label: string;
  currentnessMode: EvidenceCurrentnessModeValue;
  riskCategories?: string[];
  modules?: string[];
};

export type CoreEvidenceFamily = {
  key: string;
  label: string;
  types: CoreEvidenceType[];
};

const type = (key:string,label:string,currentnessMode:EvidenceCurrentnessModeValue,riskCategories?:string[],modules?:string[]):CoreEvidenceType=>({key,label,currentnessMode,riskCategories,modules});

export const CORE_EVIDENCE_FAMILIES:CoreEvidenceFamily[]=[
  {key:"CARE_CLINICAL",label:"Care & Clinical",types:[
    type("CARE_PLAN","Care plan","SUPERSESSION_BASED",["Care quality","Clinical"]),
    type("CARE_PLAN_REVIEW","Care plan review","HISTORICAL_NON_EXPIRING",["Care quality","Clinical"]),
    type("DAILY_NOTES","Daily notes","HISTORICAL_NON_EXPIRING",["Care quality","Clinical"]),
    type("CLINICAL_ASSESSMENT","Clinical assessment","REVIEW_BASED",["Clinical"]),
    type("HOSPITAL_DISCHARGE","Hospital discharge record","HISTORICAL_NON_EXPIRING",["Clinical","Medicines"]),
  ]},
  {key:"RISK_SAFETY",label:"Risk & Safety",types:[
    type("RISK_ASSESSMENT","Risk assessment","REVIEW_BASED",["Care quality","Clinical","Health and safety"]),
    type("INCIDENT_REPORT","Incident or near-miss report","HISTORICAL_NON_EXPIRING",undefined,["Incident","Risk"]),
    type("INVESTIGATION","Investigation record","HISTORICAL_NON_EXPIRING"),
    type("SAFETY_INSPECTION","Safety inspection","EXPIRY_BASED",["Health and safety"]),
  ]},
  {key:"MEDICINES",label:"Medicines",types:[
    type("MAR_EMAR","MAR/eMAR","CURRENT_SOURCE",["Medicines"]),
    type("CURRENT_PRESCRIPTION","Current prescription","SUPERSESSION_BASED",["Medicines"]),
    type("MEDICATION_AUDIT","Medication audit","HISTORICAL_NON_EXPIRING",["Medicines"]),
    type("MEDICATION_COMPETENCY","Medication competency","EXPIRY_BASED",["Medicines"]),
    type("MEDICATION_REVIEW","Medication review","HISTORICAL_NON_EXPIRING",["Medicines"]),
    type("PHARMACY_CORRESPONDENCE","Pharmacy correspondence","HISTORICAL_NON_EXPIRING",["Medicines"]),
    type("MEDICATION_INCIDENT","Medication incident","HISTORICAL_NON_EXPIRING",["Medicines"]),
  ]},
  {key:"SAFEGUARDING",label:"Safeguarding",types:[
    type("SAFEGUARDING_CONCERN","Safeguarding concern","HISTORICAL_NON_EXPIRING",["Safeguarding"]),
    type("SAFEGUARDING_REFERRAL","Safeguarding referral","HISTORICAL_NON_EXPIRING",["Safeguarding"]),
    type("SAFEGUARDING_OUTCOME","Safeguarding outcome","HISTORICAL_NON_EXPIRING",["Safeguarding"]),
    type("PROTECTION_PLAN","Protection plan","REVIEW_BASED",["Safeguarding"]),
  ]},
  {key:"WORKFORCE",label:"Workforce",types:[
    type("TRAINING_RECORD","Training record","EXPIRY_BASED",["Workforce"]),
    type("COMPETENCY_ASSESSMENT","Competency assessment","EXPIRY_BASED",["Workforce","Medicines"]),
    type("SUPERVISION","Supervision","HISTORICAL_NON_EXPIRING",["Workforce"]),
    type("APPRAISAL","Appraisal","HISTORICAL_NON_EXPIRING",["Workforce"]),
    type("SPOT_CHECK","Spot check","HISTORICAL_NON_EXPIRING",["Workforce"]),
    type("RECRUITMENT_CHECK","Recruitment check","EXPIRY_BASED",["Workforce"]),
  ]},
  {key:"QUALITY_AUDIT",label:"Quality & Audit",types:[
    type("AUDIT","Audit","HISTORICAL_NON_EXPIRING",undefined,["Audit"]),
    type("QA_REVIEW","QA review","HISTORICAL_NON_EXPIRING"),
    type("COMPLIANCE_REVIEW","Compliance review","HISTORICAL_NON_EXPIRING",["Compliance"]),
    type("MONITORING_REPORT","Monitoring report","HISTORICAL_NON_EXPIRING"),
    type("MOCK_INSPECTION","Mock inspection","HISTORICAL_NON_EXPIRING",["Compliance"]),
    type("IMPROVEMENT_REVIEW","Improvement review","HISTORICAL_NON_EXPIRING"),
  ]},
  {key:"PERSON_FEEDBACK",label:"Person / Representative Feedback",types:[
    type("COMPLAINT","Complaint","HISTORICAL_NON_EXPIRING"),type("COMPLIMENT","Compliment","HISTORICAL_NON_EXPIRING"),type("SURVEY","Survey","HISTORICAL_NON_EXPIRING"),type("REPRESENTATIVE_CORRESPONDENCE","Representative correspondence","HISTORICAL_NON_EXPIRING"),
  ]},
  {key:"PROFESSIONAL_EXTERNAL",label:"Professional / External",types:[
    type("GP_CORRESPONDENCE","GP correspondence","HISTORICAL_NON_EXPIRING",["Clinical","Medicines"]),type("DISTRICT_NURSE","District Nurse","HISTORICAL_NON_EXPIRING",["Clinical"]),type("SALT","SALT","HISTORICAL_NON_EXPIRING",["Clinical"]),type("OT","Occupational Therapy","HISTORICAL_NON_EXPIRING",["Clinical"]),type("PHYSIOTHERAPY","Physiotherapy","HISTORICAL_NON_EXPIRING",["Clinical"]),type("HOSPITAL","Hospital","HISTORICAL_NON_EXPIRING",["Clinical"]),type("PHARMACIST","Pharmacist","HISTORICAL_NON_EXPIRING",["Medicines"]),type("LOCAL_AUTHORITY","Local Authority","HISTORICAL_NON_EXPIRING"),type("COMMISSIONER","Commissioner","HISTORICAL_NON_EXPIRING",["Commissioner contract"]),type("SPECIALIST_CLINICIAN","Specialist clinician","HISTORICAL_NON_EXPIRING",["Clinical"]),
  ]},
  {key:"EQUIPMENT_ENVIRONMENT",label:"Equipment & Environment",types:[
    type("EQUIPMENT_INSPECTION","Equipment inspection","EXPIRY_BASED",["Health and safety","Clinical"]),type("SERVICING_MAINTENANCE","Servicing or maintenance","EXPIRY_BASED",["Health and safety"]),type("ENVIRONMENT_CHECK","Environment check","EXPIRY_BASED",["Health and safety"]),
  ]},
  {key:"GOVERNANCE_MANAGEMENT",label:"Governance & Management",types:[
    type("GOVERNANCE_MEETING","Governance meeting","HISTORICAL_NON_EXPIRING"),type("MANAGEMENT_REVIEW","Management review","HISTORICAL_NON_EXPIRING"),type("DECISION_RECORD","Decision record","HISTORICAL_NON_EXPIRING"),type("ACTION_TRACKER","Action tracker","CURRENT_SOURCE"),type("BOARD_ASSURANCE","Board/provider assurance","HISTORICAL_NON_EXPIRING"),
  ]},
  {key:"REGULATORY_COMMISSIONER",label:"Regulatory & Commissioner",types:[
    type("CQC_NOTIFICATION","CQC notification","HISTORICAL_NON_EXPIRING",["Compliance"]),type("COMMISSIONER_NOTIFICATION","Commissioner notification","HISTORICAL_NON_EXPIRING",["Commissioner contract"]),type("STATUTORY_CORRESPONDENCE","Statutory correspondence","HISTORICAL_NON_EXPIRING"),type("CONTRACT_MONITORING","Contract monitoring","REVIEW_BASED",["Commissioner contract"]),
  ]},
  {key:"IG_CYBER",label:"Information Governance & Cyber",types:[
    type("DPIA","DPIA","REVIEW_BASED",["Information governance"]),type("ACCESS_REVIEW","Access review","HISTORICAL_NON_EXPIRING",["Information governance","Cyber security"]),type("CYBER_ASSESSMENT","Cyber assessment","REVIEW_BASED",["Cyber security"]),type("DATA_INCIDENT","Data incident","HISTORICAL_NON_EXPIRING",["Information governance","Cyber security"]),
  ]},
  {key:"BUSINESS_CONTINUITY",label:"Business Continuity",types:[
    type("BCP","Business continuity plan","SUPERSESSION_BASED",["Business continuity"]),type("BCP_EXERCISE","Business continuity exercise","HISTORICAL_NON_EXPIRING",["Business continuity"]),type("RECOVERY_RECORD","Recovery record","HISTORICAL_NON_EXPIRING",["Business continuity"]),
  ]},
  {key:"POLICY_PROCEDURE",label:"Policy & Procedure",types:[
    type("POLICY","Policy","SUPERSESSION_BASED",undefined,["Policy"]),type("PROCEDURE","Procedure/SOP","SUPERSESSION_BASED"),type("STAFF_GUIDANCE","Staff guidance","SUPERSESSION_BASED"),
  ]},
  {key:"OTHER",label:"Other",types:[type("OTHER_SPECIFIED","Other — specify","REVIEW_BASED")]},
];

export function evidenceFamily(key:string){return CORE_EVIDENCE_FAMILIES.find(item=>item.key===key)}
export function evidenceType(familyKey:string,typeKey:string){return evidenceFamily(familyKey)?.types.find(item=>item.key===typeKey)}
export function evidenceTypesForContext(input:{familyKey?:string;riskCategory?:string;module?:string}){
  const families=input.familyKey?CORE_EVIDENCE_FAMILIES.filter(item=>item.key===input.familyKey):CORE_EVIDENCE_FAMILIES;
  return families.flatMap(family=>family.types.filter(item=>(!item.riskCategories?.length||!input.riskCategory||item.riskCategories.includes(input.riskCategory))&&(!item.modules?.length||!input.module||item.modules.includes(input.module))).map(item=>({...item,familyKey:family.key,familyLabel:family.label})));
}
export function taxonomyLabels(familyKey:string,typeKey:string){const family=evidenceFamily(familyKey),type=family?.types.find(item=>item.key===typeKey);return family&&type?{familyLabel:family.label,typeLabel:type.label,currentnessMode:type.currentnessMode}:null}
export function evidenceTaxonomySuggestions(riskCategory:string){return evidenceTypesForContext({riskCategory}).slice(0,12)}
export function taxonomyLabel(value:string){return value.replaceAll("_"," ").toLowerCase().replace(/^\w/,letter=>letter.toUpperCase())}
