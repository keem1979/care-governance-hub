import { NextResponse } from "next/server";
import { syncAuditEvidence } from "@/lib/audit-evidence";
import { requirePermission } from "@/lib/auth/dal";
import { auditScopeWhere } from "@/lib/audits";
import { createDb } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";
import { auditAssuranceReadiness } from "@/lib/audit-assurance";

export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}) {
  const context=await requirePermission(PERMISSIONS.GOVERNANCE_EDIT); const {id}=await params; const form=await request.formData(); const intent=String(form.get("intent")??"");
  const db=createDb();
  try {
    const audit=await db.audit.findFirst({where:{id,...auditScopeWhere(context)},include:{template:{select:{key:true,name:true,category:true,sections:{select:{questions:{select:{id:true,mandatory:true}}}}}},responses:{select:{questionId:true,answer:true}},findings:{include:{action:{select:{closedAt:true}},reaudits:{select:{outcome:true}}}}}});
    if(!audit)return NextResponse.json({error:"Audit not found."},{status:404});
    const mandatory=audit.template.sections.flatMap(section=>section.questions).filter(question=>question.mandatory), answered=new Set(audit.responses.filter(response=>response.answer).map(response=>response.questionId));
    const readiness=auditAssuranceReadiness({status:audit.status,mandatoryQuestionCount:mandatory.length,mandatoryAnsweredCount:mandatory.filter(question=>answered.has(question.id)).length,fieldworkCompletedAt:audit.fieldworkCompletedAt,findings:audit.findings});
    if(intent==="complete") {
      const fieldworkBlockers=readiness.outstanding.filter(check=>["mandatory-fieldwork","critical-safety"].includes(check.key));
      if(fieldworkBlockers.length)return NextResponse.json({error:"Fieldwork is not ready for sign-off.",requirements:fieldworkBlockers},{status:409});
    }
    const assuranceRationale=String(form.get("rationale")??"").trim();
    if(intent==="close"&&assuranceRationale.length<12)return NextResponse.json({error:"Record the management assurance rationale for closure."},{status:400});
    if(intent==="close"&&!readiness.ready)return NextResponse.json({error:"This Audit is not ready for governance assurance.",requirements:readiness.outstanding},{status:409});
    const now=new Date();
    const data=intent==="complete"?{status:"COMPLETED" as const,signedOffById:context.user.id,signedOffAt:now,fieldworkCompletedById:context.user.id,fieldworkCompletedAt:now}:intent==="close"?{status:"CLOSED" as const,governanceAssuredById:context.user.id,governanceAssuredAt:now,governanceAssuranceRationale:assuranceRationale}:intent==="archive"?{status:"ARCHIVED" as const,archivedAt:now}:intent==="restore"?{status:"IN_PROGRESS" as const,archivedAt:null}:{};
    if(!Object.keys(data).length)return NextResponse.json({error:"Invalid action."},{status:400});
    await db.$transaction(async(tx)=>{await tx.audit.update({where:{id},data});if(["complete","close","archive","restore"].includes(intent))await syncAuditEvidence(tx,{auditId:id,organisationId:context.organisation.id,locationId:audit.locationId,templateKey:audit.template.key,templateName:audit.template.name,templateCategory:audit.template.category,templateVersion:audit.templateVersion,title:audit.title,auditDate:audit.auditDate,reviewDate:audit.reviewDate,auditorId:audit.auditorId,actorId:context.user.id,score:audit.overallScore,status:data.status??audit.status,strengths:audit.strengths,risks:audit.risks,recommendations:audit.recommendations});await tx.activityLog.create({data:{organisationId:context.organisation.id,locationId:audit.locationId,userId:context.user.id,action:intent==="archive"?"ARCHIVE":intent==="restore"?"RESTORE":intent==="close"?"APPROVAL":"UPDATE",recordType:"Audit",recordId:id,summary:`${intent.charAt(0).toUpperCase()+intent.slice(1)} audit: ${audit.title}`,afterValue:{status:data.status,assuranceRationale:intent==="close"?assuranceRationale:null,checks:readiness.checks}}})});
    return NextResponse.json({ok:true});
  } finally {await db.$disconnect();}
}
