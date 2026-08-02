import Link from "next/link";
import { notFound } from "next/navigation";
import { RegisterEntryForm } from "@/components/register-entry-form";
import { assessmentType } from "@/lib/assessments";
import { requirePermission } from "@/lib/auth/dal";
import { clientName, clientScopeWhere } from "@/lib/clients";
import { createDb } from "@/lib/db";
import { evidenceScopeWhere } from "@/lib/evidence";
import { PERMISSIONS } from "@/lib/permissions";
import { parseRegisterFields, registerFormExperience, registerGuidance } from "@/lib/registers";
import { workforceScopeWhere } from "@/lib/workforce";

export default async function NewRegisterEntryPage({ params, searchParams }: { params: Promise<{ key: string }>; searchParams: Promise<Record<string,string|string[]|undefined>> }) {
  const context = await requirePermission(PERMISSIONS.GOVERNANCE_EDIT);
  const { key } = await params;
  const query = await searchParams;
  const db = createDb();
  try {
    const [definition, memberships, evidence, clients, staff] = await Promise.all([
      db.registerDefinition.findFirst({ where: { key, isPublished: true, OR: [{ organisationId: null }, { organisationId: context.organisation.id }] } }),
      db.organisationMembership.findMany({ where: { organisationId: context.organisation.id, status: "ACTIVE" }, select: { user: { select: { id: true, name: true } } }, orderBy: { user: { name: "asc" } } }),
      db.evidence.findMany({ where: { ...evidenceScopeWhere(context), status: "ACTIVE", NOT: { relatedModule: "RegisterEntry" } }, select: { id: true, title: true }, orderBy: { title: "asc" } }),
      db.client.findMany({where:{...clientScopeWhere(context),status:{in:["PROSPECT","ACTIVE","PAUSED"]}},select:{id:true,clientNumber:true,clientReference:true,firstName:true,lastName:true,preferredName:true},orderBy:[{lastName:"asc"},{firstName:"asc"}],take:500}),
      db.staffMember.findMany({where:{...workforceScopeWhere(context),employmentStatus:{not:"LEFT"}},select:{id:true,staffNumber:true,employeeReference:true,firstName:true,lastName:true,preferredName:true},orderBy:[{lastName:"asc"},{firstName:"asc"}],take:500}),
    ]);
    if (!definition) notFound();
    const experience = registerFormExperience(key, definition.name);
    const guidance = registerGuidance(key);
    return <main className="mx-auto max-w-4xl space-y-5">
      <div><Link href={`/registers/${key}`} className="text-sm font-semibold text-emerald-700">Back to {definition.name}</Link><h1 className="mt-2 text-3xl font-bold">{experience.saveLabel}</h1><p className="mt-1 text-slate-600">{definition.description} The form below uses prompts specific to this record.</p></div>
      <aside className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-950"><p><strong>When to use this register:</strong> {guidance.when}</p><p className="mt-1">The saved entry will also be listed in the Evidence Library.</p><a href={guidance.sourceUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex font-bold text-blue-800">Read the relevant official guidance ↗</a></aside>
      <RegisterEntryForm registerKey={key} registerName={definition.name} fields={parseRegisterFields(definition.fieldSchema)} locations={context.locations.map((item) => ({ id: item.id, name: item.name }))} owners={memberships.map(({ user }) => user)} clients={clients.map(person=>({id:person.id,name:`${clientName(person)} · Client ${person.clientNumber} · ${person.clientReference}`}))} staff={staff.map(person=>({id:person.id,name:`${person.preferredName||person.firstName} ${person.lastName} · Staff ${person.staffNumber} · ${person.employeeReference}`}))} clientRequired={Boolean(assessmentType(key)&&assessmentType(key)?.stage!=="SERVICE")} defaultClientId={String(query.clientId??"")} evidence={evidence} />
    </main>;
  } finally { await db.$disconnect(); }
}
