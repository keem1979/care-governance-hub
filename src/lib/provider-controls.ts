import { evidenceAssuranceState } from "@/lib/evidence-assurance";
import { stableRiskCategoryKey } from "@/lib/risk-framework";

export const PROVIDER_CONTROL_FAMILIES=["PEOPLE","PROCESS","TECHNOLOGY","PROFESSIONAL_EXTERNAL","PHYSICAL_ENVIRONMENTAL","GOVERNANCE"] as const;
export const CONTROL_EFFECTIVENESS_OUTCOMES=["NOT_TESTED","INEFFECTIVE","PARTIALLY_EFFECTIVE","EFFECTIVE","INSUFFICIENT_EVIDENCE"] as const;

export function providerControlScopeAllowed(context:{allLocations:boolean;locations:{id:string}[]},scopeType:string,locationIds:string[]){
  const authorised=new Set(context.locations.map(item=>item.id));
  if(scopeType==="ORGANISATION")return context.allLocations;
  return locationIds.length>0&&locationIds.every(id=>authorised.has(id));
}

export function providerControlApplies(input:{status:string;scopeType:string;locationIds:string[];riskLocationId:string|null;categoryKeys:string[];riskCategory:string}){
  if(input.status!=="EFFECTIVE")return false;
  if(input.scopeType==="SELECTED_LOCATIONS"&&(!input.riskLocationId||!input.locationIds.includes(input.riskLocationId)))return false;
  return !input.categoryKeys.length||input.categoryKeys.includes(stableRiskCategoryKey(input.riskCategory)??"");
}

type ControlEvidence={role:string;evidence:{title:string;taxonomyFamilyKey?:string|null;taxonomyTypeKey?:string|null;status:string;reviewExpiryDate:Date|null;updatedAt:Date;currentVersionId:string|null;currentnessMode?:string|null;currentnessStatus?:string|null;verifications:{outcome:string;verifiedAt:Date;evidenceVersionId:string|null;reviewDueAt:Date|null}[]}};
export function controlApplicationAssurance(input:{status:string;controlStatus:string;expectedFamilyKeys:string[];expectedTypeKeys:string[];evidenceLinks:ControlEvidence[];latestEffectiveness?:{outcome:string}|null}){
  const supporting=input.evidenceLinks.filter(link=>link.role==="CONTROL");
  const effectiveness=input.evidenceLinks.filter(link=>link.role==="EFFECTIVENESS");
  const states=supporting.map(link=>({title:link.evidence.title,state:evidenceAssuranceState({...link.evidence,verification:link.evidence.verifications[0]})}));
  const gaps:string[]=[];const conflicts:string[]=[];
  if(input.status==="REVIEW_REQUIRED"||input.controlStatus!=="EFFECTIVE")gaps.push("The applied Provider Control has changed, retired or requires review.");
  if(!supporting.length)gaps.push("Supporting Control Evidence is missing.");
  if(input.expectedFamilyKeys.length&&!supporting.some(link=>link.evidence.taxonomyFamilyKey&&input.expectedFamilyKeys.includes(link.evidence.taxonomyFamilyKey)))gaps.push("Linked Control Evidence does not match an expected Evidence family.");
  if(input.expectedTypeKeys.length&&!supporting.some(link=>link.evidence.taxonomyFamilyKey&&link.evidence.taxonomyTypeKey&&input.expectedTypeKeys.includes(`${link.evidence.taxonomyFamilyKey}:${link.evidence.taxonomyTypeKey}`)))gaps.push("Linked Control Evidence does not match an expected contextual Evidence type.");
  if(states.some(item=>!["CURRENT_VERIFIED","VERIFIED_WITH_LIMITATIONS","EXPIRING_SOON","HISTORICAL"].includes(item.state)))gaps.push("Supporting Evidence has a currentness or verification issue.");
  if(!input.latestEffectiveness||input.latestEffectiveness.outcome==="NOT_TESTED")gaps.push("Control effectiveness has not been tested.");
  if(input.latestEffectiveness?.outcome==="INSUFFICIENT_EVIDENCE")gaps.push("The latest effectiveness review found insufficient Evidence.");
  if(input.latestEffectiveness?.outcome==="EFFECTIVE"&&!effectiveness.length)conflicts.push("The Control is marked Effective, but no Effectiveness Evidence is linked.");
  if(input.latestEffectiveness?.outcome==="EFFECTIVE"&&states.some(item=>["EXPIRED","REVIEW_DUE","SUPERSEDED","REJECTED","STALE_VERIFICATION","UNVERIFIED","ARCHIVED"].includes(item.state)))conflicts.push("The Control is marked Effective, but linked supporting Evidence has an unresolved assurance issue.");
  return {gaps:[...new Set(gaps)],conflicts:[...new Set(conflicts)],supportingEvidenceCount:supporting.length,effectivenessEvidenceCount:effectiveness.length,evidenceStates:states,ready:gaps.length===0&&conflicts.length===0};
}

export function controlReference(title:string){return `CTL-${title.toUpperCase().replace(/[^A-Z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,32)||"CONTROL"}`}
export function controlLabel(value:string){return value.replaceAll("_"," ").toLowerCase().replace(/^\w/,letter=>letter.toUpperCase())}
