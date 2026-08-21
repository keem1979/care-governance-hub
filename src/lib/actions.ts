import { hasPermission, PERMISSIONS } from "@/lib/permissions";

export const ACTION_STATUSES = ["OPEN","IN_PROGRESS","BLOCKED","AWAITING_EVIDENCE","AWAITING_VERIFICATION","COMPLETED","OVERDUE","CANCELLED","ARCHIVED"] as const;
export const ACTION_PRIORITIES = ["LOW","MEDIUM","HIGH","CRITICAL"] as const;
export const ACTION_SOURCE_TYPES = ["AUDIT","CARE_PLAN","COMPLAINT","INCIDENT","SAFEGUARDING","RISK","GOVERNANCE_MEETING","POLICY_REVIEW","REGISTER","ASSESSMENT","INSPECTION","KPI","WORKFORCE","SPOT_CHECK","SUPERVISION","APPRAISAL","COMPETENCY","TRAINING","EVIDENCE","MANUAL"] as const;
export const ACTION_CATEGORIES = [
  "Governance and regulatory duties",
  "Care planning and reviews",
  "Assessments and changing needs",
  "Risk management",
  "Safeguarding",
  "Medicines",
  "Incidents and accidents",
  "Complaints, feedback and duty of candour",
  "Spot checks and observed practice",
  "Audits and inspection readiness",
  "People’s outcomes and experience",
  "Consent, capacity and human rights",
  "Workforce recruitment and suitability",
  "Induction, training and competency",
  "Supervision and appraisal",
  "Staffing capacity and continuity",
  "Infection prevention and control",
  "Health and safety",
  "Fire, premises and equipment",
  "Information governance and data protection",
  "Policies and procedures",
  "Commissioner and contractual requirements",
  "Notifications and statutory reporting",
  "Business continuity",
  "Quality improvement",
  "Safety",
  "Care quality",
  "Workforce",
  "Complaints",
  "Governance",
  "Information governance",
  "Commissioner requirement",
  "Other",
] as const;

export function actionLabel(value:string){return value.replaceAll("_"," ").toLowerCase().replace(/^\w/,(letter)=>letter.toUpperCase())}
export function makeActionReference(now=new Date(),random=Math.floor(Math.random()*1000)){const date=`${now.getUTCFullYear()}${String(now.getUTCMonth()+1).padStart(2,"0")}${String(now.getUTCDate()).padStart(2,"0")}`;return`ACT-${date}-${String(random).padStart(3,"0")}`}
export function effectiveActionStatus(status:string,dueDate:Date,now=new Date()){return !["COMPLETED","CANCELLED","ARCHIVED"].includes(status)&&dueDate<now?"OVERDUE":status}
export function actionDaysRemaining(dueDate:Date|string,now=new Date()){return Math.ceil((new Date(dueDate).getTime()-now.getTime())/86_400_000)}
export function actionProgressValue(status:string,entered:number){if(status==="COMPLETED")return 100;if(status==="OPEN")return Math.min(entered,99);return Math.max(0,Math.min(99,entered))}
export function actionReadiness(input:{status:string;evidenceRequired:boolean;evidenceCount:number;progressPercent:number;verifiedById?:string|null;verificationDate?:Date|null;closedAt?:Date|null}){if(input.closedAt||input.status==="COMPLETED")return"CLOSED";if(input.progressPercent<100)return"WORK_IN_PROGRESS";if(input.evidenceRequired&&input.evidenceCount===0)return"NEEDS_EVIDENCE";if(!input.verifiedById||!input.verificationDate)return"NEEDS_VERIFICATION";return"ASSURANCE_REVIEW_REQUIRED"}
export function actionScopeWhere(context:{organisation:{id:string};allLocations:boolean;locations:{id:string}[];user:{id:string};permissions:string[]}){
  const locationScope=context.allLocations?{}:{OR:[{locationId:null},{locationId:{in:context.locations.map(({id})=>id)}}]};
  return{organisationId:context.organisation.id,...locationScope,...(hasPermission(context.permissions,PERMISSIONS.GOVERNANCE_VIEW)?{}:{ownerId:context.user.id})};
}
export function validateActionClosure(input:{status:string;evidenceCount:number;waiver?:string;closureNote?:string;verifiedById?:string;verificationDate?:Date|null}){
  if(input.status!=="COMPLETED")return;
  if(input.evidenceCount===0&&!input.waiver?.trim())throw new Error("Attach evidence or record a permitted evidence-waiver explanation.");
  if(!input.closureNote?.trim())throw new Error("Enter a closure note.");
  if(!input.verifiedById||!input.verificationDate)throw new Error("Completed actions require named verification and a verification date.");
}
export function priorityClasses(priority:string){return priority==="CRITICAL"?"bg-red-700 text-white":priority==="HIGH"?"bg-orange-100 text-orange-900":priority==="MEDIUM"?"bg-amber-100 text-amber-900":"bg-emerald-100 text-emerald-900"}
export function sourcePath(type:string,id:string|null,storedUrl?:string|null){if(storedUrl)return storedUrl;if(!id)return null;if(type==="AUDIT")return`/audits/${id}`;if(type==="CARE_PLAN")return`/care-plans/${id}`;if(["COMPLAINT","INCIDENT","SAFEGUARDING"].includes(type))return`/registers/${type.toLowerCase()}${type==="COMPLAINT"?"s":type==="INCIDENT"?"s":""}/${id}`;if(type==="RISK")return`/risks/${id}`;if(type==="POLICY_REVIEW")return`/policies/${id}`;if(type==="GOVERNANCE_MEETING")return`/meetings/${id}`;if(type==="INSPECTION")return`/inspection/${id}`;if(["WORKFORCE","SPOT_CHECK","SUPERVISION","APPRAISAL","COMPETENCY","TRAINING"].includes(type))return`/workforce/${id}`;if(type==="EVIDENCE")return`/evidence/${id}`;return null}
