import Link from "next/link";
import { RiskForm } from "@/components/risk-form";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";
import { listRiskEvidenceOptions } from "@/lib/risk-evidence-options";

export default async function NewRiskPage() {
  const context = await requirePermission(PERMISSIONS.GOVERNANCE_EDIT); const db = createDb();
  try {
    const [memberships,evidence,framework] = await Promise.all([
      db.organisationMembership.findMany({ where: { organisationId: context.organisation.id, status: "ACTIVE" }, select: { user: { select: { id: true, name: true } } }, orderBy: { user: { name: "asc" } } }),
      listRiskEvidenceOptions(db, context),
      db.riskFrameworkVersion.findFirst({where:{organisationId:context.organisation.id,status:"EFFECTIVE",effectiveFrom:{lte:new Date()},OR:[{effectiveTo:null},{effectiveTo:{gt:new Date()}}]},include:{rules:true},orderBy:[{effectiveFrom:"desc"},{versionNumber:"desc"}]}),
    ]);
    return <main className="mx-auto max-w-5xl space-y-5"><div><Link href="/risks" className="text-sm font-semibold text-emerald-700">← Risk Register</Link><p className="mt-4 text-xs font-bold uppercase tracking-widest text-emerald-700">Risk assessment</p><h1 className="mt-1 text-3xl font-bold">Record and assess a risk</h1><p className="mt-1 max-w-3xl text-slate-600">Link what QCGMS already knows, confirm the current controls and add professional judgement only where it is needed.</p></div><RiskForm locations={context.locations.map(({id,name})=>({id,name}))} owners={memberships.map(({user})=>user)} evidence={evidence} initial={undefined} framework={framework?{versionNumber:framework.versionNumber,defaultAppetite:framework.defaultAppetite,defaultToleranceScore:framework.defaultToleranceScore,rules:framework.rules.map(rule=>({categoryKey:rule.categoryKey,appetite:rule.appetite,toleranceScore:rule.toleranceScore}))}:undefined}/></main>;
  } finally { await db.$disconnect(); }
}
