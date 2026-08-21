import Link from "next/link";
import { notFound } from "next/navigation";
import { RiskForm } from "@/components/risk-form";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";
import { listRiskEvidenceOptions } from "@/lib/risk-evidence-options";
import { riskScopeWhere } from "@/lib/risks";

export default async function EditRiskPage({ params }: { params: Promise<{ id: string }> }) {
  const context = await requirePermission(PERMISSIONS.GOVERNANCE_EDIT); const { id } = await params; const db = createDb();
  try {
    const [risk,memberships,evidence] = await Promise.all([
      db.risk.findFirst({ where: { id, ...riskScopeWhere(context) }, include: { evidenceLinks: true,riskFrameworkVersion:{select:{versionNumber:true}} } }),
      db.organisationMembership.findMany({ where: { organisationId: context.organisation.id, status: "ACTIVE" }, select: { user: { select: { id: true, name: true } } }, orderBy: { user: { name: "asc" } } }),
      listRiskEvidenceOptions(db, context, id),
    ]); if (!risk) notFound();
    return <main className="mx-auto max-w-5xl space-y-5"><div><Link href={`/risks/${id}`} className="text-sm font-semibold text-emerald-700">← Back to risk</Link><h1 className="mt-2 text-3xl font-bold">Review and edit risk</h1><p className="mt-1 text-slate-600">Update the facts, controls and target position. Use the formal review on the risk record to preserve a dated review history.</p></div><RiskForm locations={context.locations.map(({id,name})=>({id,name}))} owners={memberships.map(({user})=>user)} evidence={evidence} initial={{id:risk.id,reference:risk.reference,title:risk.title,description:risk.description,cause:risk.cause??"",riskEvent:risk.riskEvent??risk.title,consequence:risk.consequence??risk.description,peopleAffected:risk.peopleAffected??"People receiving care, staff and service delivery",category:risk.category,sourceType:risk.sourceType??"Manual identification",sourceReference:risk.sourceReference??"",identifiedDate:inputDate(risk.identifiedDate),locationId:risk.locationId??"",ownerId:risk.ownerId??"",existingControls:risk.existingControls,controlEffectiveness:risk.controlEffectiveness??"NOT_TESTED",controlAssurance:risk.controlAssurance??"",likelihood:risk.likelihood,impact:risk.impact,residualLikelihood:risk.residualLikelihood,residualImpact:risk.residualImpact,appetite:risk.appetite??"LOW",toleranceScore:risk.toleranceScore??9,acceptanceRationale:risk.acceptanceRationale??"",treatmentStrategy:risk.treatmentStrategy??"REDUCE",furtherControls:risk.furtherControls??"",targetDate:inputDate(risk.targetDate),targetLikelihood:risk.targetLikelihood??risk.residualLikelihood,targetImpact:risk.targetImpact??risk.residualImpact,keyRiskIndicator:risk.keyRiskIndicator??"",indicatorThreshold:risk.indicatorThreshold??"",escalationRoute:risk.escalationRoute??"",reviewTriggers:risk.reviewTriggers??"",reviewFrequency:risk.reviewFrequency,lastReviewDate:inputDate(risk.lastReviewDate),nextReviewDate:inputDate(risk.nextReviewDate),status:risk.status==="ARCHIVED"?"OPEN":risk.status,closureRationale:risk.closureRationale??"",closureApprovedById:risk.closureApprovedById??"",closureDate:inputDate(risk.closureDate),evidenceIds:risk.evidenceLinks.filter(({evidenceId})=>evidenceId).map(({evidenceId})=>evidenceId),frameworkVersionNumber:risk.riskFrameworkVersion?.versionNumber}}/></main>;
  } finally { await db.$disconnect(); }
}
function inputDate(value:Date|null){return value?.toISOString().slice(0,10)??""}
