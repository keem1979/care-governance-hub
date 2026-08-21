import { parseOptionalDate } from "@/lib/policies";
import { CONTROL_EFFECTIVENESS, REVIEW_FREQUENCIES, RISK_APPETITES, RISK_CATEGORIES, RISK_SOURCES, RISK_STATUSES, TREATMENT_STRATEGIES, isOutsideTolerance, riskLevel, riskScore, validateRiskPlan } from "@/lib/risks";

export function parseRiskInput(form:FormData, governed?:{appetite:string;toleranceScore:number|null}){
  const cause=text(form,"cause"),riskEvent=text(form,"riskEvent"),consequence=text(form,"consequence"),peopleAffected=text(form,"peopleAffected");
  if(cause.length<3||riskEvent.length<3||consequence.length<3||peopleAffected.length<2)throw new Error("Complete the cause, uncertain event, potential consequences and who may be affected.");
  const title=text(form,"title"),description=`Because ${cause}, there is a risk that ${riskEvent}, resulting in ${consequence}.`;
  const category=text(form,"category")||"Other",sourceType=text(form,"sourceType")||"Manual identification",sourceReference=text(form,"sourceReference")||null,identifiedDate=parseOptionalDate(form.get("identifiedDate"))??new Date();
  const existingControls=text(form,"existingControls"),controlEffectiveness=text(form,"controlEffectiveness"),controlAssurance=text(form,"controlAssurance")||null;
  const likelihood=number(form,"likelihood"),impact=number(form,"impact"),initialScore=riskScore(likelihood,impact);
  const residualLikelihood=number(form,"residualLikelihood"),residualImpact=number(form,"residualImpact"),residualScore=riskScore(residualLikelihood,residualImpact);
  const targetLikelihood=number(form,"targetLikelihood"),targetImpact=number(form,"targetImpact"),targetScore=riskScore(targetLikelihood,targetImpact);
  const treatmentStrategy=text(form,"treatmentStrategy"),furtherControls=text(form,"furtherControls")||null,appetite=governed?.appetite??text(form,"appetite"),toleranceScore=governed?.toleranceScore??number(form,"toleranceScore"),acceptanceRationale=text(form,"acceptanceRationale")||null;
  const ownerId=text(form,"ownerId")||null,locationId=text(form,"locationId")||null,status=text(form,"status")||"OPEN",reviewFrequency=text(form,"reviewFrequency")||"Quarterly",nextReviewDate=parseOptionalDate(form.get("nextReviewDate")),targetDate=parseOptionalDate(form.get("targetDate"));
  if(title.length<3||existingControls.length<3)throw new Error("Enter a clear risk title and the controls already in place.");
  if(!RISK_CATEGORIES.includes(category as never)||!RISK_SOURCES.includes(sourceType as never)||!CONTROL_EFFECTIVENESS.includes(controlEffectiveness as never)||!TREATMENT_STRATEGIES.includes(treatmentStrategy as never)||!RISK_APPETITES.includes(appetite as never)||!RISK_STATUSES.includes(status as never)||!REVIEW_FREQUENCIES.includes(reviewFrequency as never))throw new Error("Choose valid risk, control, treatment and review values.");
  if(!nextReviewDate)throw new Error("Choose the next review date.");
  validateRiskPlan({residualScore,targetScore,toleranceScore,ownerId,treatmentStrategy,acceptanceRationale});
  if(isOutsideTolerance(residualScore,toleranceScore)&&treatmentStrategy!=="ACCEPT"){
    if(!furtherControls)throw new Error("This risk is outside tolerance. Add the treatment actions needed to reduce it.");
    if(!ownerId||!targetDate)throw new Error("Risks outside tolerance need a treatment owner and target date.");
  }
  if(status==="ACCEPTED"&&treatmentStrategy!=="ACCEPT")throw new Error("Choose Accept as the treatment strategy before marking a risk accepted.");
  return {title,description,cause,riskEvent,consequence,peopleAffected,category,sourceType,sourceReference,identifiedDate,existingControls,controlEffectiveness,controlAssurance,likelihood,impact,initialScore,initialLevel:riskLevel(initialScore),furtherControls,treatmentStrategy,ownerId,locationId,targetDate,residualLikelihood,residualImpact,residualScore,residualLevel:riskLevel(residualScore),appetite,toleranceScore,acceptanceRationale,targetLikelihood,targetImpact,targetScore,targetLevel:riskLevel(targetScore),keyRiskIndicator:text(form,"keyRiskIndicator")||null,indicatorThreshold:text(form,"indicatorThreshold")||null,escalationRoute:text(form,"escalationRoute")||null,reviewTriggers:text(form,"reviewTriggers")||null,reviewFrequency,lastReviewDate:parseOptionalDate(form.get("lastReviewDate")),nextReviewDate,status,closureRationale:text(form,"closureRationale")||null,closureApprovedById:text(form,"closureApprovedById")||null,closureDate:parseOptionalDate(form.get("closureDate"))};
}
function text(form:FormData,name:string){return String(form.get(name)??"").trim()}
function number(form:FormData,name:string){return Number(form.get(name))}
