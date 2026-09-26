import Link from "next/link";
import { notFound } from "next/navigation";
import { RegisterEntryForm } from "@/components/register-entry-form";
import { assessmentType } from "@/lib/assessments";
import { requirePermission } from "@/lib/auth/dal";
import { clientName, clientScopeWhere } from "@/lib/clients";
import { createDb } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";
import { isInitialCaptureKey } from "@/lib/initial-capture";
import { parseRegisterFields, registerFormExperience, registerGuidance } from "@/lib/registers";
import { workforceScopeWhere } from "@/lib/workforce";

export default async function NewRegisterEntryPage({ params, searchParams }: { params: Promise<{ key: string }>; searchParams: Promise<Record<string,string|string[]|undefined>> }) {
  const context = await requirePermission(PERMISSIONS.GOVERNANCE_EDIT);
  const { key } = await params;
  const query = await searchParams;
  const db = createDb();
  try {
    const [definition, memberships, clients, staff] = await Promise.all([
      db.registerDefinition.findFirst({ where: { key, isPublished: true, OR: [{ organisationId: null }, { organisationId: context.organisation.id }] } }),
      db.organisationMembership.findMany({ where: { organisationId: context.organisation.id, status: "ACTIVE" }, select: { user: { select: { id: true, name: true } } }, orderBy: { user: { name: "asc" } } }),
      db.client.findMany({where:{...clientScopeWhere(context),status:{in:["PROSPECT","ACTIVE","PAUSED"]}},select:{id:true,clientNumber:true,clientReference:true,firstName:true,lastName:true,preferredName:true},orderBy:[{lastName:"asc"},{firstName:"asc"}],take:100}),
      db.staffMember.findMany({where:{...workforceScopeWhere(context),employmentStatus:{not:"LEFT"}},select:{id:true,staffNumber:true,employeeReference:true,firstName:true,lastName:true,preferredName:true},orderBy:[{lastName:"asc"},{firstName:"asc"}],take:100}),
    ]);
    if (!definition) notFound();
    const experience = registerFormExperience(key, definition.name);
    const guidance = registerGuidance(key);
    const quickCapture = isInitialCaptureKey(key);
    const clientContextId = typeof query.clientId === "string" && clients.some((person) => person.id === query.clientId) ? query.clientId : "";
    const staffContextId = typeof query.staffId === "string" && staff.some((person) => person.id === query.staffId) ? query.staffId : "";
    const requestedLocationId = typeof query.locationId === "string" && context.locations.some((location) => location.id === query.locationId) ? query.locationId : "";
    return <main className="mx-auto max-w-4xl space-y-5">
      <div><Link href={`/registers/${key}`} className="text-sm font-semibold text-emerald-700">Back to {definition.name}</Link><h1 className="mt-2 text-3xl font-bold">{quickCapture ? `Record ${key === "safeguarding" ? "safeguarding concern" : key === "complaints" ? "complaint" : "incident"}` : experience.saveLabel}</h1><p className="mt-1 text-slate-600">{quickCapture ? "Record the facts and immediate safety position. Complete governance work from the saved record." : `${definition.description} The form below uses prompts specific to this record.`}</p></div>
      {!quickCapture ? <aside className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-950"><p><strong>When to use this register:</strong> {guidance.when}</p><p className="mt-1">The saved entry will also be listed in the Evidence Library.</p><a href={guidance.sourceUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex font-bold text-blue-800">Read the relevant official guidance ↗</a></aside> : null}
      <RegisterEntryForm registerKey={key} registerName={definition.name} fields={parseRegisterFields(definition.fieldSchema)} locations={context.locations.map((item) => ({ id: item.id, name: item.name }))} owners={memberships.map(({ user }) => user)} clients={clients.map(person=>({id:person.id,name:`${clientName(person)} · ${person.clientReference}`}))} staff={staff.map(person=>({id:person.id,name:`${person.preferredName||person.firstName} ${person.lastName} · ${person.employeeReference}`}))} clientRequired={key==="safeguarding"||Boolean(assessmentType(key)&&assessmentType(key)?.stage!=="SERVICE")} defaultClientId={clientContextId} defaultStaffId={staffContextId} defaultLocationId={requestedLocationId || (context.locations.length===1?context.locations[0].id:"")} defaultOwnerId={context.user.id} allLocations={context.allLocations} evidence={[]} knownContext={{ organisationName: context.organisation.name, recordedBy: context.user.name, locationName: context.locations.length === 1 ? context.locations[0].name : "Organisation-wide" }} />
      {quickCapture ? <details className="rounded-xl border border-slate-200 bg-white p-4 text-sm"><summary className="cursor-pointer font-semibold text-slate-800">When to use this record and official guidance</summary><p className="mt-3 text-slate-600">{guidance.when}</p><a href={guidance.sourceUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex font-semibold text-emerald-700">Read the relevant official guidance ↗</a></details> : null}
    </main>;
  } finally { await db.$disconnect(); }
}
