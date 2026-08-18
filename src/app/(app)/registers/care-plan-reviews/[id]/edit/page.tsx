import Link from "next/link";
import { notFound } from "next/navigation";
import { CarePlanReviewForm } from "@/components/care-plan-review-form";
import { requirePermission } from "@/lib/auth/dal";
import { carePlanReviewData } from "@/lib/care-plan-reviews";
import { clientName, clientScopeWhere } from "@/lib/clients";
import { createDb } from "@/lib/db";
import { evidenceScopeWhere } from "@/lib/evidence";
import { PERMISSIONS } from "@/lib/permissions";
import { registerScopeWhere } from "@/lib/registers";

export default async function EditCarePlanReviewPage({ params }: { params: Promise<{id:string}> }) {
  const context = await requirePermission(PERMISSIONS.GOVERNANCE_EDIT);
  const { id } = await params;
  const db = createDb();
  try {
    const [entry, memberships, evidence, clients] = await Promise.all([
      db.registerEntry.findFirst({ where: { id, ...registerScopeWhere(context), definition: { key: "care-plan-reviews" } }, include: { evidenceLinks: true } }),
      db.organisationMembership.findMany({ where: { organisationId: context.organisation.id, status: "ACTIVE" }, select: { user: { select: { id: true, name: true } } }, orderBy: { user: { name: "asc" } } }),
      db.evidence.findMany({ where: { ...evidenceScopeWhere(context), status: "ACTIVE", NOT: { relatedModule: "RegisterEntry" } }, select: { id: true, title: true }, orderBy: { title: "asc" }, take: 1000 }),
      db.client.findMany({ where: { ...clientScopeWhere(context), status: { not: "ARCHIVED" } }, select: { id: true, clientNumber: true, clientReference: true, firstName: true, lastName: true, preferredName: true }, orderBy: [{ lastName: "asc" }, { firstName: "asc" }], take: 1000 }),
    ]);
    if (!entry) notFound();
    const data = carePlanReviewData(entry.data);
    return <main className="space-y-5"><header><Link href={`/registers/care-plan-reviews/${id}`} className="text-sm font-semibold text-emerald-700">← Back to review</Link><p className="mt-3 font-mono text-sm text-emerald-700">{entry.reference}</p><h1 className="text-3xl font-bold">Edit care-plan review</h1>{data.rmSignOffAt ? <p className="mt-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">This review has been signed. Record a reopen reason in the RM assurance section before saving material changes.</p> : null}</header><CarePlanReviewForm organisationName={context.organisation.name} locations={context.locations.map(({id,name})=>({id,name}))} owners={memberships.map(({user})=>user)} clients={clients.map((person)=>({id:person.id,name:`${clientName(person)} · Client ${person.clientNumber} · ${person.clientReference}`}))} evidence={evidence} initial={{id:entry.id,reference:entry.reference,clientId:entry.clientId??"",locationId:entry.locationId??"",ownerId:entry.ownerId??"",riskLevel:entry.riskLevel,status:entry.status,data,evidenceIds:entry.evidenceLinks.map((item)=>item.evidenceId)}}/></main>;
  } finally { await db.$disconnect(); }
}
