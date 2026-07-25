import Link from "next/link";
import { notFound } from "next/navigation";
import { RiskForm } from "@/components/risk-form";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { evidenceScopeWhere } from "@/lib/evidence";
import { PERMISSIONS } from "@/lib/permissions";
import { riskScopeWhere } from "@/lib/risks";

export default async function EditRiskPage({ params }: { params: Promise<{ id: string }> }) {
  const context = await requirePermission(PERMISSIONS.GOVERNANCE_EDIT); const { id } = await params; const db = createDb();
  try {
    const [risk,memberships,evidence] = await Promise.all([
      db.risk.findFirst({ where: { id, ...riskScopeWhere(context) }, include: { evidenceLinks: true } }),
      db.organisationMembership.findMany({ where: { organisationId: context.organisation.id, status: "ACTIVE" }, select: { user: { select: { id: true, name: true } } }, orderBy: { user: { name: "asc" } } }),
      db.evidence.findMany({ where: { ...evidenceScopeWhere(context), status: "ACTIVE" }, select: { id: true, title: true }, orderBy: { title: "asc" } }),
    ]); if (!risk) notFound();
    return <main className="mx-auto max-w-4xl space-y-5"><div><Link href={`/risks/${id}`} className="text-sm font-semibold text-emerald-700">← Back to risk</Link><h1 className="mt-2 text-3xl font-bold">Edit risk</h1></div><RiskForm locations={context.locations.map(({id,name})=>({id,name}))} owners={memberships.map(({user})=>user)} evidence={evidence.map(({id,title})=>({id,name:title}))} initial={{id:risk.id,reference:risk.reference,title:risk.title,description:risk.description,category:risk.category,locationId:risk.locationId??"",existingControls:risk.existingControls,likelihood:risk.likelihood,impact:risk.impact,furtherControls:risk.furtherControls??"",ownerId:risk.ownerId??"",targetDate:inputDate(risk.targetDate),residualLikelihood:risk.residualLikelihood,residualImpact:risk.residualImpact,reviewFrequency:risk.reviewFrequency,lastReviewDate:inputDate(risk.lastReviewDate),nextReviewDate:inputDate(risk.nextReviewDate),status:risk.status,closureRationale:risk.closureRationale??"",closureApprovedById:risk.closureApprovedById??"",closureDate:inputDate(risk.closureDate),evidenceIds:risk.evidenceLinks.map(({evidenceId})=>evidenceId)}}/></main>;
  } finally { await db.$disconnect(); }
}
function inputDate(value:Date|null){return value?.toISOString().slice(0,10)??""}
