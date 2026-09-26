import { managementAssuranceTest } from "@/lib/management-assurance";
import { ROLE_KEYS } from "@/lib/permissions";

export const SAFEGUARDING_CATEGORIES = ["Physical abuse","Domestic abuse","Sexual abuse","Psychological / emotional abuse","Financial / material abuse","Modern slavery","Discriminatory abuse","Organisational abuse","Neglect / acts of omission","Self-neglect","Other"] as const;
export const SAFEGUARDING_EVENT_TYPES = ["IMMEDIATE_CONTROL","REFERRAL","COMMUNICATION","EXTERNAL_RESPONSE","ENQUIRY_UPDATE","EVIDENCE_ADDED","PROGRESS_UPDATE","OUTCOME","OTHER"] as const;

type Action = { closedAt: Date | null; effectivenessOutcome?: string | null };
type Case = {
  status: string; safetyPosition: string; immediateControl: string | null; concernCategories: string[];
  triageRationale: string | null; referralDecision: string; referredTo: string[]; referralDate: Date | null;
  externalResponseStatus: string | null; investigationQuestion: string | null; investigationSummary: string | null;
  findings: string | null; outcome: string | null; externalDependencies: string | null; learning: string | null;
  affectedRecordsReviewed: string | null; recurrenceReview: string | null; noFurtherActionRationale: string | null;
  investigatorId?: string | null;
} | null;

export function safeguardingAssuranceReadiness(input:{riskLevel:string;caseRecord:Case;actions:Action[];evidenceCount:number}) {
  const material=["MEDIUM","HIGH","CRITICAL"].includes(input.riskLevel), serious=["HIGH","CRITICAL"].includes(input.riskLevel);
  const has=(value:string|null|undefined)=>Boolean(value?.trim());
  const open=input.actions.filter((action)=>!action.closedAt), ineffective=input.actions.filter((action)=>action.closedAt&&action.effectivenessOutcome!=="EFFECTIVE");
  const unresolvedSafety=input.caseRecord?.safetyPosition==="UNRESOLVED_IMMEDIATE_RISK"||input.caseRecord?.safetyPosition==="UNKNOWN_EVIDENCE_REQUIRED";
  const referralAddressed=input.caseRecord?.referralDecision==="NOT_REQUIRED"||(input.caseRecord?.referralDecision==="MADE"&&Boolean(input.caseRecord.referralDate)&&input.caseRecord.referredTo.length>0);
  const checks=[
    {key:"risk-assessed",label:"Professional risk level assessed",met:input.riskLevel!=="UNASSESSED",reason:"Record an accountable risk judgement before management assurance or closure. Unassessed does not mean Low."},
    {key:"current-safety",label:"Person's current safety is established",met:Boolean(input.caseRecord)&&!unresolvedSafety,reason:"Confirm the current safety position. An unresolved or unknown immediate risk prevents assurance."},
    {key:"immediate-control",label:"Immediate protection is recorded where required",met:input.caseRecord?.safetyPosition==="SAFE_NOW"||has(input.caseRecord?.immediateControl),reason:"Record the immediate protection or control when a risk required intervention."},
    {key:"triage",label:"Concern is proportionately triaged",met:Boolean(input.caseRecord?.concernCategories.length)&&has(input.caseRecord?.triageRationale),reason:"An authorised professional must classify the concern and record the triage rationale."},
    {key:"referral",label:"Referral decision is addressed",met:referralAddressed,reason:"Record whether referral was required. If made, retain the destination and date; QCGMS does not decide the threshold."},
    {key:"enquiry",label:"Proportionate enquiry or investigation is complete",met:!material||(input.caseRecord?.status==="READY_FOR_ASSURANCE"&&has(input.caseRecord.investigationSummary)),reason:"Material safeguarding requires a completed enquiry summary before assurance."},
    {key:"findings",label:"Findings and outcome are recorded",met:!material||(has(input.caseRecord?.findings)&&has(input.caseRecord?.outcome)),reason:"Record the authorised finding and outcome without allowing QCGMS to decide them."},
    {key:"evidence",label:"Sufficient appropriate governed Evidence is linked",met:!material||input.evidenceCount>0,reason:"Material safeguarding requires governed Evidence. Low concerns may use an accountable rationale where separate Evidence is disproportionate."},
    {key:"action-path",label:"Required improvement uses central Actions",met:!serious||input.actions.length>0||has(input.caseRecord?.noFurtherActionRationale),reason:"Use canonical Follow-Up Actions for improvement, or record why no Action is proportionate."},
    {key:"actions",label:"No safeguarding Actions remain unresolved",met:open.length===0,reason:`${open.length} linked central Action(s) remain open. Action and safeguarding closure are separate decisions.`},
    {key:"effectiveness",label:"Serious safeguarding Actions have demonstrated effectiveness",met:!serious||ineffective.length===0,reason:`${ineffective.length} closed Action(s) do not have an Effective outcome. Completion does not prove improvement.`},
    {key:"dependencies",label:"External dependencies are understood",met:!serious||has(input.caseRecord?.externalDependencies)||has(input.caseRecord?.externalResponseStatus),reason:"Record outstanding external decisions, responses or dependencies for serious safeguarding."},
    {key:"affected-records",label:"Affected governed records were considered",met:!serious||has(input.caseRecord?.affectedRecordsReviewed),reason:"Record which care plans, risks, workforce controls or other governed records were reviewed; do not silently overwrite them."},
    {key:"learning",label:"Learning and recurrence were considered",met:!material||has(input.caseRecord?.learning),reason:"Record learning or a proportionate rationale. Serious concerns should also consider recurrence."},
  ];
  return managementAssuranceTest(checks);
}

export function safeguardingClosureAuthority(input:{riskLevel:string;actorRoleKey:string;actorId:string;createdById:string;investigatorId?:string|null}) {
  const low=[ROLE_KEYS.OWNER,ROLE_KEYS.REGISTERED_MANAGER,ROLE_KEYS.QUALITY_MANAGER];
  const material=[...low,ROLE_KEYS.NOMINATED_INDIVIDUAL];
  const serious=[ROLE_KEYS.OWNER,ROLE_KEYS.REGISTERED_MANAGER,ROLE_KEYS.NOMINATED_INDIVIDUAL];
  const authorisedRoles=input.riskLevel==="LOW"?low:["HIGH","CRITICAL"].includes(input.riskLevel)?serious:material;
  const roleAuthorised=authorisedRoles.includes(input.actorRoleKey as never), separate=input.riskLevel==="CRITICAL";
  const independent=!separate||(input.actorId!==input.createdById&&input.actorId!==input.investigatorId);
  return {authorisedRoles,roleAuthorised,separateDecisionRequired:separate,independent,allowed:roleAuthorised&&independent,reason:!roleAuthorised?"Your provider role is not authorised to close this safeguarding level.":!independent?"Critical safeguarding requires an authorised closer who did not create or investigate the concern.":"Authorised for this safeguarding level."};
}

export function safeguardingStage(input:{closed:boolean;reopened:boolean;caseStatus?:string|null;openActions:number;ready:boolean}) {
  if(input.closed)return "CLOSED"; if(input.reopened)return "REOPENED"; if(input.openActions)return "ACTIONS_OUTSTANDING";
  if(input.ready)return "AWAITING_ASSURANCE"; return input.caseStatus??"DRAFT";
}
