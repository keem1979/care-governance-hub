import Link from "next/link";
import { RiskForm } from "@/components/risk-form";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { evidenceScopeWhere } from "@/lib/evidence";
import { PERMISSIONS } from "@/lib/permissions";

export default async function NewRiskPage() {
  const context = await requirePermission(PERMISSIONS.GOVERNANCE_EDIT); const db = createDb();
  try {
    const [memberships,evidence] = await Promise.all([
      db.organisationMembership.findMany({ where: { organisationId: context.organisation.id, status: "ACTIVE" }, select: { user: { select: { id: true, name: true } } }, orderBy: { user: { name: "asc" } } }),
      db.evidence.findMany({ where: { ...evidenceScopeWhere(context), status: "ACTIVE" }, select: { id: true, title: true }, orderBy: { title: "asc" } }),
    ]);
    return <main className="mx-auto max-w-4xl space-y-5"><div><Link href="/risks" className="text-sm font-semibold text-emerald-700">← Risk Register</Link><h1 className="mt-2 text-3xl font-bold">Add risk</h1><p className="mt-1 text-slate-600">Scores are calculated automatically from likelihood and impact.</p></div><RiskForm locations={context.locations.map(({id,name})=>({id,name}))} owners={memberships.map(({user})=>user)} evidence={evidence.map(({id,title})=>({id,name:title}))} initial={undefined}/></main>;
  } finally { await db.$disconnect(); }
}
