import Link from "next/link";
import { EvidenceForm } from "@/components/evidence-form";
import { requirePermission } from "@/lib/auth/dal";
import { clientName, clientScopeWhere } from "@/lib/clients";
import { createDb } from "@/lib/db";
import { evidenceRequirementByKey } from "@/lib/evidence-requirements";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { workforceScopeWhere } from "@/lib/workforce";

export default async function NewEvidencePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const context = await requirePermission(PERMISSIONS.EVIDENCE_UPLOAD);
  const query = await searchParams;
  const requirement = evidenceRequirementByKey(String(query.requirement ?? ""));
  const relatedModule = String(query.relatedModule ?? "");
  const relatedRecordId = String(query.relatedRecordId ?? "");
  const db = createDb();
  try {
    const [memberships, policies, providerTypes, related] = await Promise.all([
      db.organisationMembership.findMany({ where: { organisationId: context.organisation.id, status: "ACTIVE" }, select: { user: { select: { id: true, name: true } } }, orderBy: { user: { name: "asc" } } }),
      db.policy.findMany({ where: { organisationId: context.organisation.id, status: { not: "ARCHIVED" } }, select: { id: true, title: true }, orderBy: { title: "asc" } }),
      db.providerEvidenceType.findMany({ where: { organisationId: context.organisation.id, status: "ACTIVE" }, select: { id: true, familyKey: true, label: true }, orderBy: { label: "asc" } }),
      resolveRelatedProfile(db, context, relatedModule, relatedRecordId),
    ]);
    return <main className="mx-auto max-w-4xl space-y-5"><div><Link href={related?.href ?? (requirement ? "/evidence/requirements" : "/evidence")} className="text-sm font-semibold text-emerald-700">← {related ? related.label : requirement ? "Evidence Requirements Register" : "Evidence Library"}</Link><h1 className="mt-2 text-3xl font-bold">Upload evidence</h1><p className="mt-1 text-slate-600">{related ? `Add a governed source record to ${related.label}.` : requirement ? `Add the source record for: ${requirement.title}.` : "Upload one file with full details or several files into the same category."}</p></div><EvidenceForm owners={memberships.map(({ user }) => user)} locations={context.locations.map((location) => ({ id: location.id, name: location.name }))} policies={policies} providerTypes={providerTypes} requirement={requirement} related={related ? { module: related.module, id: related.id, label: related.label, locationId: related.locationId, sourceName: context.organisation.name } : undefined} /></main>;
  } finally {
    await db.$disconnect();
  }
}

async function resolveRelatedProfile(
  db: ReturnType<typeof createDb>,
  context: Awaited<ReturnType<typeof requirePermission>>,
  module: string,
  id: string,
) {
  if (!id) return undefined;
  if (module === "Client" && hasPermission(context.permissions, PERMISSIONS.GOVERNANCE_VIEW)) {
    const client = await db.client.findFirst({ where: { id, ...clientScopeWhere(context) }, select: { id: true, firstName: true, preferredName: true, lastName: true, clientReference: true, locationId: true } });
    return client ? { module: "Client" as const, id: client.id, label: `${clientName(client)} · ${client.clientReference}`, locationId: client.locationId ?? "", href: `/clients/${client.id}` } : undefined;
  }
  if (module === "StaffMember" && context.permissions.some((permission) => [PERMISSIONS.WORKFORCE_VIEW, PERMISSIONS.WORKFORCE_MANAGE].includes(permission as never))) {
    const staff = await db.staffMember.findFirst({ where: { id, ...workforceScopeWhere(context) }, select: { id: true, firstName: true, preferredName: true, lastName: true, employeeReference: true, locationId: true } });
    return staff ? { module: "StaffMember" as const, id: staff.id, label: `${staff.preferredName?.trim() || staff.firstName} ${staff.lastName} · ${staff.employeeReference}`, locationId: staff.locationId ?? "", href: `/workforce/${staff.id}` } : undefined;
  }
  return undefined;
}
