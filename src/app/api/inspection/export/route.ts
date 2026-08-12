import { requirePermission } from "@/lib/auth/dal";
import { assuranceLabel } from "@/lib/inspection-assurance";
import { getInspectionRequirements } from "@/lib/inspection-data";
import { inspectionLabel } from "@/lib/inspection";
import { PERMISSIONS } from "@/lib/permissions";

export async function GET(){const context=await requirePermission(PERMISSIONS.REPORTS_EXPORT),requirements=await getInspectionRequirements(context);const header=["Key question","Quality statement","Requirement","Framework","Regulations","Calculated assurance %","Assurance status","RM decision","RM signed off","Owner","Location","Review date","Current records","Category coverage %","Covered evidence categories","Blockers","Strengths","Areas for improvement","Impact on people","Connected records"];
const rows=requirements.map(x=>[inspectionLabel(x.keyQuestion),x.qualityStatement??"",x.title,x.frameworkVersion,x.regulations.join("; "),x.assurance.score,assuranceLabel(x.assurance.status),assuranceLabel(x.managementDecision),x.signedOffAt?x.signedOffAt.toISOString().slice(0,10):"",x.owner?.name??"Unassigned",x.location?.name??"Organisation-wide",x.reviewDate?.toISOString().slice(0,10)??"",x.assurance.currentRecords,x.assurance.categoryCoverage,x.coveredCategories.map(assuranceLabel).join("; "),x.assurance.blockers.join("; "),x.strengths??"",x.areasForImprovement??"",x.impactOnPeople??"",x.connectedRecords.map(r=>`${r.type}: ${r.label} [${r.status}]`).join("; ")]);return new Response(`\uFEFF${[header,...rows].map(row=>row.map(csv).join(",")).join("\r\n")}`,{headers:{"Content-Type":"text/csv; charset=utf-8","Content-Disposition":'attachment; filename="rm-inspection-assurance-index.csv"'}})}
function csv(value:unknown){return`"${String(value??"").replaceAll('"','""')}"`}
