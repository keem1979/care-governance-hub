import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";
import { parseOptionalDate } from "@/lib/policies";

export async function POST(request: Request) {
  const context = await requirePermission(PERMISSIONS.AUDITS_COMPLETE);
  const form = await request.formData();
  const templateId = String(form.get("templateId") ?? "");
  const locationId = String(form.get("locationId") ?? "");
  const title = String(form.get("title") ?? "").trim();
  try {
    if (!context.locations.some((location) => location.id === locationId)) throw new Error("Choose an authorised service location.");
    if (title.length < 3 || title.length > 180) throw new Error("Enter an audit title.");
    const db = createDb();
    try {
      const template = await db.auditTemplate.findFirst({ where: { id:templateId,isPublished:true,OR:[{organisationId:null},{organisationId:context.organisation.id}] }, include: { sections: { select: { _count: { select: { questions: true } } } } } });
      if (!template) throw new Error("Choose a published audit template.");
      if (!template.sections.some((section) => section._count.questions > 0)) throw new Error("This audit template has no questions and cannot be started.");
      const objective=String(form.get("objective")??"").trim(),sampleMethod=String(form.get("sampleMethod")??"").trim(),sampleSize=Number(form.get("sampleSize")??0),sampleDetails=String(form.get("sampleDetails")??"").trim(),standardApplied=String(form.get("standardApplied")??"").trim();
      if(objective.length<10)throw new Error("Describe the purpose of this audit.");
      if(sampleMethod.length<3||!Number.isInteger(sampleSize)||sampleSize<1)throw new Error("Describe the sampling method and enter a sample size of at least 1.");
      if(standardApplied.length<3)throw new Error("State the standard or procedure being tested.");
      const auditDate = parseOptionalDate(form.get("auditDate")) ?? new Date();
      const periodStart=parseOptionalDate(form.get("periodStart")),periodEnd=parseOptionalDate(form.get("periodEnd"));
      if(periodStart&&periodEnd&&periodStart>periodEnd)throw new Error("The review period start date must be before the end date.");
      const audit = await db.$transaction(async (tx) => {
        const created = await tx.audit.create({ data: {
          organisationId:context.organisation.id,templateId,templateVersion:template.version,auditorId:context.user.id,
          locationId,title,auditDate,periodStart,periodEnd,scope:String(form.get("scope") ?? "").trim() || null,objective,sampleMethod,sampleSize,sampleDetails:sampleDetails||null,standardApplied,limitations:String(form.get("limitations")??"").trim()||null,status:"IN_PROGRESS",
        } });
        await tx.activityLog.create({data:{organisationId:context.organisation.id,locationId,userId:context.user.id,action:"CREATE",recordType:"Audit",recordId:created.id,summary:`Started audit: ${title}`,afterValue:{template:template.name,version:template.version}}});
        return created;
      });
      return NextResponse.json({id:audit.id},{status:201});
    } finally { await db.$disconnect(); }
  } catch(error) { return NextResponse.json({error:error instanceof Error?error.message:"Could not start audit."},{status:400}); }
}
