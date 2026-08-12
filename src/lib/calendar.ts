export const CALENDAR_ITEM_TYPES=["CERTIFICATE_EXPIRY","INSURANCE_EXPIRY","TRAINING_EXPIRY","SUPERVISION_DEADLINE","APPRAISAL_DEADLINE","SERVICE_REVIEW","BUSINESS_CONTINUITY_TEST","OTHER"]as const;
export const CALENDAR_RECORD_TYPES=["POLICY_REVIEW","AUDIT_DUE","GOVERNANCE_MEETING","RISK_REVIEW","ACTION_DEADLINE","EVIDENCE_EXPIRY","INSPECTION_REVIEW",...CALENDAR_ITEM_TYPES]as const;
export const CALENDAR_STATUSES=["UPCOMING","OVERDUE","COMPLETED","CANCELLED"]as const;
export const REMINDER_OFFSETS=[90,60,30,14,7,0,-1]as const;
export type CalendarEvent={key:string;title:string;description:string;date:Date;type:string;status:string;href:string|null;locationId:string|null;locationName:string;ownerId:string|null;ownerName:string;riskLevel:string|null};
export function calendarLabel(value:string){return value.replaceAll("_"," ").toLowerCase().replace(/^\w/,(letter)=>letter.toUpperCase())}
export function calendarStatus(status:string,date:Date,now=new Date()){if(["COMPLETED","CANCELLED"].includes(status))return status;return date<startOfDay(now)?"OVERDUE":"UPCOMING"}
export function startOfDay(value:Date){const date=new Date(value);date.setUTCHours(0,0,0,0);return date}
export function addDays(value:Date,days:number){const date=new Date(value);date.setUTCDate(date.getUTCDate()+days);return date}
export function monthGrid(anchor:Date){const first=new Date(Date.UTC(anchor.getUTCFullYear(),anchor.getUTCMonth(),1)),last=new Date(Date.UTC(anchor.getUTCFullYear(),anchor.getUTCMonth()+1,0));const start=addDays(first,-((first.getUTCDay()+6)%7)),end=addDays(last,6-((last.getUTCDay()+6)%7));const days:Date[]=[];for(let date=start;date<=end;date=addDays(date,1))days.push(date);return{start,end,days}}
export function weekGrid(anchor:Date){const start=addDays(startOfDay(anchor),-((anchor.getUTCDay()+6)%7));return{start,end:addDays(start,6),days:Array.from({length:7},(_,index)=>addDays(start,index))}}
export function reminderIsDue(dueDate:Date,offsetDays:number,now=new Date()){if(offsetDays===-1)return dueDate<startOfDay(now);return addDays(dueDate,-offsetDays)<=now&&dueDate>=startOfDay(now)}
export function sameDay(a:Date,b:Date){return a.toISOString().slice(0,10)===b.toISOString().slice(0,10)}
export function itemTypeFromEvidence(category:string,type:string){const text=`${category} ${type}`.toLowerCase();if(text.includes("training")||text.includes("competenc"))return"TRAINING_EXPIRY";if(text.includes("certificate"))return"CERTIFICATE_EXPIRY";if(text.includes("insurance"))return"INSURANCE_EXPIRY";if(text.includes("supervision"))return"SUPERVISION_DEADLINE";if(text.includes("appraisal"))return"APPRAISAL_DEADLINE";return"EVIDENCE_EXPIRY"}
