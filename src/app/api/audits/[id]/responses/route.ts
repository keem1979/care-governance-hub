import { NextResponse } from "next/server";
import { syncAuditEvidence } from "@/lib/audit-evidence";
import { requirePermission } from "@/lib/auth/dal";
import { auditScopeWhere, calculateAuditScore, scoreAnswer } from "@/lib/audits";
import { createDb } from "@/lib/db";
import { evidenceScopeWhere } from "@/lib/evidence";
import { PERMISSIONS } from "@/lib/permissions";

type SubmittedResponse = { questionId:string;answer:string;comment:string;evidenceId:string };
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}) {
  const context = await requirePermission(PERMISSIONS.AUDITS_COMPLETE); const {id}=await params;
  try {
    const body = await request.json() as {intent?:string;responses?:SubmittedResponse[];strengths?:string;risks?:string;recommendations?:string;reviewDate?:string};
    const submitted = Array.isArray(body.responses)?body.responses:[];
    const db=createDb();
    try {
      const audit=await db.audit.findFirst({where:{id,...auditScopeWhere(context)},include:{template:{include:{sections:{include:{questions:true}}}}}});
      if(!audit) return NextResponse.json({error:"Audit not found."},{status:404});
      if(["COMPLETED","CLOSED","ARCHIVED"].includes(audit.status)) return NextResponse.json({error:"This audit is no longer editable."},{status:409});
      const questions=audit.template.sections.flatMap((section)=>section.questions);
      const responseByQuestion=new Map(submitted.map((item)=>[item.questionId,item]));
      if(body.intent==="submit") {
        for(const question of questions) {
          const item=responseByQuestion.get(question.id);
          if(question.mandatory && !item?.answer) throw new Error(`Answer every mandatory question before submitting.`);
          if(question.requiresCommentNonCompliant && item?.answer==="NON_COMPLIANT" && !item.comment.trim()) throw new Error("Add a comment for every non-compliant answer.");
          if(question.requiresEvidence && item?.answer && item.answer!=="NOT_APPLICABLE" && !item.evidenceId) throw new Error("Attach evidence where the template requires it.");
          if(["COMPLIANCE","YES_NO"].includes(question.responseType) && item?.answer && item.answer!=="NOT_APPLICABLE" && !item.evidenceId && item.comment.trim().length < 8) throw new Error("For every applicable check, describe what you checked or link supporting evidence.");
        }
      }
      for(const item of submitted) {
        const question=questions.find((candidate)=>candidate.id===item.questionId); if(!question) continue;
        if(item.evidenceId && !(await db.evidence.findFirst({where:{id:item.evidenceId,...evidenceScopeWhere(context)},select:{id:true}}))) throw new Error("Linked evidence could not be found.");
        const response=await db.auditResponse.upsert({where:{auditId_questionId:{auditId:id,questionId:item.questionId}},create:{auditId:id,questionId:item.questionId,answer:item.answer||null,comment:item.comment.trim()||null,evidenceId:item.evidenceId||null,score:scoreAnswer(item.answer)},update:{answer:item.answer||null,comment:item.comment.trim()||null,evidenceId:item.evidenceId||null,score:scoreAnswer(item.answer)}});
        if(item.answer==="NON_COMPLIANT" || item.answer==="PARTIALLY_COMPLIANT") await db.auditFinding.upsert({where:{responseId:response.id},create:{auditId:id,responseId:response.id,severity:item.answer==="NON_COMPLIANT"?"HIGH":"MEDIUM",summary:question.text,recommendation:item.comment.trim()||"Create and complete a corrective action.",actionRequired:true},update:{severity:item.answer==="NON_COMPLIANT"?"HIGH":"MEDIUM",summary:question.text,recommendation:item.comment.trim()||"Create and complete a corrective action.",actionRequired:true,resolvedAt:null}});
        else await db.auditFinding.deleteMany({where:{responseId:response.id}});
      }
      const saved=await db.auditResponse.findMany({where:{auditId:id},include:{question:{select:{weighting:true}}}});
      const overallScore=calculateAuditScore(saved.map((item)=>({score:item.score,weighting:item.question.weighting})));
      const status=body.intent==="submit"?"AWAITING_REVIEW":"IN_PROGRESS";
      const strengths=body.strengths?.trim()||null,risks=body.risks?.trim()||null,recommendations=body.recommendations?.trim()||null,reviewDate=body.reviewDate?new Date(`${body.reviewDate}T12:00:00.000Z`):null;
      await db.$transaction(async(tx)=>{
        await tx.audit.update({where:{id},data:{status,overallScore,strengths,risks,recommendations,reviewDate}});
        if(body.intent==="submit") await syncAuditEvidence(tx,{auditId:id,organisationId:context.organisation.id,locationId:audit.locationId,templateKey:audit.template.key,templateName:audit.template.name,templateCategory:audit.template.category,templateVersion:audit.templateVersion,title:audit.title,auditDate:audit.auditDate,reviewDate,auditorId:audit.auditorId,actorId:context.user.id,score:overallScore,status,strengths,risks,recommendations});
        await tx.activityLog.create({data:{organisationId:context.organisation.id,locationId:audit.locationId,userId:context.user.id,action:"UPDATE",recordType:"Audit",recordId:id,summary:`${body.intent==="submit"?"Submitted":"Saved"} audit: ${audit.title}`,afterValue:{status,overallScore}}});
      });
      return NextResponse.json({ok:true,status,overallScore});
    } finally {await db.$disconnect();}
  } catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Could not save audit."},{status:400});}
}
