import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/dal";
import { auditScopeWhere } from "@/lib/audits";
import { createDb } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";

export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}) {
  const context=await requirePermission(PERMISSIONS.GOVERNANCE_EDIT); const {id}=await params; const form=await request.formData(); const intent=String(form.get("intent")??"");
  const db=createDb();
  try {
    const audit=await db.audit.findFirst({where:{id,...auditScopeWhere(context)}});
    if(!audit)return NextResponse.json({error:"Audit not found."},{status:404});
    const data=intent==="complete"?{status:"COMPLETED" as const,signedOffById:context.user.id,signedOffAt:new Date()}:intent==="close"?{status:"CLOSED" as const}:intent==="archive"?{status:"ARCHIVED" as const,archivedAt:new Date()}:intent==="restore"?{status:"IN_PROGRESS" as const,archivedAt:null}:{};
    if(!Object.keys(data).length)return NextResponse.json({error:"Invalid action."},{status:400});
    await db.$transaction([db.audit.update({where:{id},data}),db.activityLog.create({data:{organisationId:context.organisation.id,locationId:audit.locationId,userId:context.user.id,action:intent==="archive"?"ARCHIVE":intent==="restore"?"RESTORE":"UPDATE",recordType:"Audit",recordId:id,summary:`${intent.charAt(0).toUpperCase()+intent.slice(1)} audit: ${audit.title}`}})]);
    return NextResponse.json({ok:true});
  } finally {await db.$disconnect();}
}
