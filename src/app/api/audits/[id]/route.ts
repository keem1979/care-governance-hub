import { NextResponse } from "next/server";
import { syncAuditEvidence } from "@/lib/audit-evidence";
import { requirePermission } from "@/lib/auth/dal";
import { auditScopeWhere } from "@/lib/audits";
import { createDb } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";

export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}) {
  const context=await requirePermission(PERMISSIONS.GOVERNANCE_EDIT); const {id}=await params; const form=await request.formData(); const intent=String(form.get("intent")??"");
  const db=createDb();
  try {
    const audit=await db.audit.findFirst({where:{id,...auditScopeWhere(context)},include:{template:{select:{key:true,name:true,category:true}}}});
    if(!audit)return NextResponse.json({error:"Audit not found."},{status:404});
    const data=intent==="complete"?{status:"COMPLETED" as const,signedOffById:context.user.id,signedOffAt:new Date()}:intent==="close"?{status:"CLOSED" as const}:intent==="archive"?{status:"ARCHIVED" as const,archivedAt:new Date()}:intent==="restore"?{status:"IN_PROGRESS" as const,archivedAt:null}:{};
    if(!Object.keys(data).length)return NextResponse.json({error:"Invalid action."},{status:400});
    await db.$transaction(async(tx)=>{await tx.audit.update({where:{id},data});if(["complete","close","archive","restore"].includes(intent))await syncAuditEvidence(tx,{auditId:id,organisationId:context.organisation.id,locationId:audit.locationId,templateKey:audit.template.key,templateName:audit.template.name,templateCategory:audit.template.category,templateVersion:audit.templateVersion,title:audit.title,auditDate:audit.auditDate,reviewDate:audit.reviewDate,auditorId:audit.auditorId,actorId:context.user.id,score:audit.overallScore,status:data.status??audit.status,strengths:audit.strengths,risks:audit.risks,recommendations:audit.recommendations});await tx.activityLog.create({data:{organisationId:context.organisation.id,locationId:audit.locationId,userId:context.user.id,action:intent==="archive"?"ARCHIVE":intent==="restore"?"RESTORE":"UPDATE",recordType:"Audit",recordId:id,summary:`${intent.charAt(0).toUpperCase()+intent.slice(1)} audit: ${audit.title}`}})});
    return NextResponse.json({ok:true});
  } finally {await db.$disconnect();}
}
