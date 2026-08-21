import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";
import { RISK_CATEGORY_DEFINITIONS, riskFrameworkDraftSchema } from "@/lib/risk-framework";

const schema = z.object({ intent: z.enum(["submit", "approve", "activate", "retire", "withdraw"]), comment: z.string().trim().min(8).max(1000) });

export async function PUT(request:Request,{params}:{params:Promise<{id:string}>}){
  const context=await requirePermission(PERMISSIONS.ORGANISATION_MANAGE),{id}=await params,db=createDb();
  try{
    const input=riskFrameworkDraftSchema.parse(await request.json());
    const framework=await db.riskFrameworkVersion.findFirst({where:{id,organisationId:context.organisation.id,status:"DRAFT"},include:{rules:true,closurePolicyVersion:{include:{rules:true}}}});
    if(!framework)return NextResponse.json({error:"Only a Draft Risk Framework can be edited."},{status:409});
    const roleKeys=[...new Set(input.closureRules.flatMap(rule=>[...rule.proposerRoleKeys,...rule.approverRoleKeys]))],validRoles=await db.role.count({where:{key:{in:roleKeys}}});
    if(validRoles!==roleKeys.length)return NextResponse.json({error:"A selected closure authority role is no longer available."},{status:400});
    const labels=new Map(RISK_CATEGORY_DEFINITIONS),effectiveFrom=new Date(`${input.effectiveFrom}T00:00:00.000Z`);
    await db.$transaction(async tx=>{
      const updated=await tx.riskFrameworkVersion.updateMany({where:{id,organisationId:context.organisation.id,status:"DRAFT"},data:{effectiveFrom,defaultAppetite:input.defaultAppetite,defaultToleranceScore:input.defaultToleranceScore,defaultEscalation:input.defaultEscalation??null,changeRationale:input.changeRationale}});
      if(updated.count!==1)throw new Error("The framework moved into review while it was being edited. Refresh before continuing.");
      const policyUpdated=await tx.riskClosurePolicyVersion.updateMany({where:{id:framework.closurePolicyVersionId,organisationId:context.organisation.id,status:"DRAFT"},data:{effectiveFrom,changeRationale:input.changeRationale}});
      if(policyUpdated.count!==1)throw new Error("The closure policy is no longer editable.");
      await tx.riskFrameworkRule.deleteMany({where:{frameworkVersionId:id,organisationId:context.organisation.id}});
      if(input.categoryRules.length)await tx.riskFrameworkRule.createMany({data:input.categoryRules.map(rule=>({organisationId:context.organisation.id,frameworkVersionId:id,categoryKey:rule.categoryKey,categoryLabel:labels.get(rule.categoryKey)!,appetite:rule.appetite,toleranceScore:rule.toleranceScore,escalationIndicator:rule.escalationIndicator??null}))});
      await tx.riskClosureAuthorityRule.deleteMany({where:{policyVersionId:framework.closurePolicyVersionId,organisationId:context.organisation.id}});
      await tx.riskClosureAuthorityRule.createMany({data:input.closureRules.map(rule=>({organisationId:context.organisation.id,policyVersionId:framework.closurePolicyVersionId,...rule}))});
      await tx.activityLog.create({data:{organisationId:context.organisation.id,userId:context.user.id,action:"UPDATE",recordType:"RiskFrameworkVersion",recordId:id,summary:`Edited Risk Framework v${framework.versionNumber} draft`,beforeValue:{effectiveFrom:framework.effectiveFrom,defaultAppetite:framework.defaultAppetite,defaultToleranceScore:framework.defaultToleranceScore,categoryRuleCount:framework.rules.length,closureRuleCount:framework.closurePolicyVersion.rules.length},afterValue:{effectiveFrom:input.effectiveFrom,defaultAppetite:input.defaultAppetite,defaultToleranceScore:input.defaultToleranceScore,categoryRuleCount:input.categoryRules.length,closureRuleCount:input.closureRules.length,changeRationale:input.changeRationale}}});
    },{isolationLevel:"Serializable"});
    return NextResponse.json({ok:true});
  }catch(error){return NextResponse.json({error:error instanceof z.ZodError?error.issues[0]?.message:error instanceof Error?error.message:"Could not update the Risk Framework draft."},{status:400})}finally{await db.$disconnect()}
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requirePermission(PERMISSIONS.ORGANISATION_MANAGE), { id } = await params, db = createDb();
  try {
    const input = schema.parse(await request.json());
    const framework = await db.riskFrameworkVersion.findFirst({ where: { id, organisationId: context.organisation.id }, include: { closurePolicyVersion: true } });
    if (!framework) return NextResponse.json({ error: "Risk Framework not found." }, { status: 404 });
    const now = new Date();
    if (input.intent === "submit" && framework.status !== "DRAFT") throw new Error("Only a draft framework can be submitted.");
    if (input.intent === "withdraw" && framework.status !== "DRAFT") throw new Error("Only a draft framework can be withdrawn.");
    if (input.intent === "approve" && framework.status !== "IN_REVIEW") throw new Error("Only a framework in review can be approved.");
    if (input.intent === "approve" && [framework.createdById, framework.submittedById].includes(context.user.id)) throw new Error("A different authorised manager must approve this framework version.");
    if (input.intent === "activate" && framework.status !== "APPROVED") throw new Error("Only an approved framework can become effective.");
    if (input.intent === "activate" && (!framework.effectiveFrom || framework.effectiveFrom > now)) throw new Error("The approved framework cannot become effective before its recorded effective date.");
    if (input.intent === "retire" && !["EFFECTIVE", "SUPERSEDED"].includes(framework.status)) throw new Error("Only an effective or superseded framework can be retired.");
    const nextStatus = input.intent === "submit" ? "IN_REVIEW" : input.intent === "approve" ? "APPROVED" : input.intent === "activate" ? "EFFECTIVE" : "RETIRED";
    await db.$transaction(async (tx) => {
      if (input.intent === "activate") {
        await tx.riskFrameworkVersion.updateMany({ where: { organisationId: context.organisation.id, status: "EFFECTIVE", id: { not: id } }, data: { status: "SUPERSEDED", effectiveTo: now } });
        await tx.riskClosurePolicyVersion.updateMany({ where: { organisationId: context.organisation.id, status: "EFFECTIVE", id: { not: framework.closurePolicyVersionId } }, data: { status: "SUPERSEDED", effectiveTo: now } });
      }
      await tx.riskFrameworkVersion.update({ where: { id }, data: { status: nextStatus, ...(input.intent === "submit" ? { submittedById: context.user.id, submittedAt: now } : {}), ...(input.intent === "approve" ? { approvedById: context.user.id, approvedAt: now } : {}),...(input.intent==="retire"?{effectiveTo:framework.effectiveTo??now}:{}) } });
      await tx.riskClosurePolicyVersion.update({ where: { id: framework.closurePolicyVersionId }, data: { status: nextStatus, ...(input.intent === "submit" ? { submittedById: context.user.id, submittedAt: now } : {}), ...(input.intent === "approve" ? { approvedById: context.user.id, approvedAt: now } : {}),...(input.intent==="retire"?{effectiveTo:framework.closurePolicyVersion.effectiveTo??now}:{}) } });
      await tx.activityLog.create({ data: { organisationId: context.organisation.id, userId: context.user.id, action: "STATUS_CHANGE", recordType: "RiskFrameworkVersion", recordId: id, summary: `${input.intent} Risk Framework v${framework.versionNumber}`, beforeValue: { status: framework.status }, afterValue: { status: nextStatus, comment: input.comment, closurePolicyVersion: framework.closurePolicyVersion.versionNumber } } });
    });
    return NextResponse.json({ ok: true, status: nextStatus });
  } catch (error) { return NextResponse.json({ error: error instanceof z.ZodError ? error.issues[0]?.message : error instanceof Error ? error.message : "Could not change framework status." }, { status: 400 }); }
  finally { await db.$disconnect(); }
}
