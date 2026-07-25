import Link from "next/link";
import { EvidenceForm } from "@/components/evidence-form";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";

export default async function NewEvidencePage() {
  const context = await requirePermission(PERMISSIONS.EVIDENCE_UPLOAD);
  const db = createDb();
  const [memberships, policies] = await Promise.all([
    db.organisationMembership.findMany({ where: { organisationId: context.organisation.id, status: "ACTIVE" }, select: { user: { select: { id:true,name:true } } }, orderBy: { user: { name: "asc" } } }),
    db.policy.findMany({ where: { organisationId: context.organisation.id, status: { not: "ARCHIVED" } }, select: { id:true,title:true }, orderBy: { title: "asc" } }),
  ]).finally(() => db.$disconnect());
  return <main className="mx-auto max-w-4xl space-y-5"><div><Link href="/evidence" className="text-sm font-semibold text-emerald-700">← Evidence Library</Link><h1 className="mt-2 text-3xl font-bold">Upload evidence</h1><p className="mt-1 text-slate-600">Upload one file with full details or several files into the same category.</p></div><EvidenceForm owners={memberships.map(({user}) => user)} locations={context.locations.map((location) => ({id:location.id,name:location.name}))} policies={policies} /></main>;
}
