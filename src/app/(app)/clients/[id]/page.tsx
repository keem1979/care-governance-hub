import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProfilePhotoForm } from "@/components/profile-photo-form";
import { requirePermission } from "@/lib/auth/dal";
import { clientLabel, clientName, clientScopeWhere } from "@/lib/clients";
import { createDb } from "@/lib/db";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { registerStatusLabel } from "@/lib/registers";

export default async function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  const context = await requirePermission(PERMISSIONS.GOVERNANCE_VIEW);
  const { id } = await params;
  const db = createDb();
  try {
    const person = await db.client.findFirst({
      where: { id, ...clientScopeWhere(context) },
      include: {
        location: { select: { name: true } },
        registerEntries: {
          where: { status: { not: "ARCHIVED" } },
          include: {
            definition: { select: { key: true, name: true } },
            staffMember: { select: { firstName: true, lastName: true } },
            _count: { select: { evidenceLinks: true } },
          },
          orderBy: { eventDate: "desc" },
        },
      },
    });
    if (!person) notFound();

    const carePlans = await db.carePlan.findMany({
      where: { organisationId: context.organisation.id, clientId: person.id, archivedAt: null },
      orderBy: { updatedAt: "desc" },
    });
    const assessments = person.registerEntries.filter((entry) => entry.definition.key.startsWith("assessment-"));
    const reviews = person.registerEntries.filter((entry) =>
      ["care-plan-reviews", "risk-assessment-reviews", "service-user-outcomes"].includes(entry.definition.key),
    );
    const other = person.registerEntries.filter((entry) => !assessments.includes(entry) && !reviews.includes(entry));
    const canEdit = hasPermission(context.permissions, PERMISSIONS.GOVERNANCE_EDIT);
    const name = clientName(person);

    return <main className="space-y-6">
      <header>
        <Link href="/clients" className="text-sm font-semibold text-emerald-700">← Client Directory</Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-5">
          <div className="flex min-w-0 items-center gap-4">
            <div className="relative flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-4 border-white bg-emerald-100 text-2xl font-bold text-emerald-800 shadow">
              {person.profilePhotoKey ? <Image unoptimized fill className="object-cover" sizes="96px" src={`/api/clients/${person.id}/photo?v=${person.updatedAt.getTime()}`} alt={`${name} profile`} /> : <span aria-label="No profile picture">{person.firstName[0]}{person.lastName[0]}</span>}
            </div>
            <div className="min-w-0">
              <p className="font-mono text-sm text-emerald-700">Client {person.clientNumber} · {person.clientReference}</p>
              <h1 className="truncate text-3xl font-bold">{name}</h1>
              <p className="mt-1 text-slate-600">{clientLabel(person.status)} · {person.location?.name ?? "Organisation-wide"}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {carePlans[0] ? <Link href={`/care-plans/${carePlans[0].id}`} className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white">Open care plan</Link> : <Link href={`/care-plans/new?clientId=${person.id}`} className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white">Create care plan</Link>}
            <Link href={`/registers/assessment-initial-needs/new?clientId=${person.id}`} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold">Start assessment</Link>
            <Link href={carePlans[0] ? `/registers/care-plan-reviews/new?carePlanId=${carePlans[0].id}&clientId=${person.id}` : `/registers/care-plan-reviews/new?clientId=${person.id}`} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold">Start review</Link>
            <Link href={`/registers/incidents/new?clientId=${person.id}`} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold">Record incident</Link>
          </div>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Info label="Preferred name" value={person.preferredName ?? person.firstName} />
        <Info label="Service start" value={date(person.serviceStartDate)} />
        <Info label="Commissioner reference" value={person.commissionerReference ?? "Not recorded"} />
        <Info label="Linked records" value={String(person.registerEntries.length)} />
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        <Card title="Profile picture">
          {canEdit ? <ProfilePhotoForm endpoint={`/api/clients/${person.id}/photo`} entityLabel="Client" hasPhoto={Boolean(person.profilePhotoKey)} /> : <p className="text-slate-500">Only authorised editors can update this picture.</p>}
        </Card>
        <Card title="Contact">
          <p>{person.phone ?? "No phone recorded"}</p>
          <p>{person.email ?? "No email recorded"}</p>
          <p>{[person.addressLine, person.town, person.postcode].filter(Boolean).join(", ") || "No address recorded"}</p>
        </Card>
        <Card title="Communication and emergency contact">
          <p className="whitespace-pre-wrap"><strong>Communication:</strong> {person.communicationSummary ?? "Not recorded"}</p>
          <p className="mt-3 whitespace-pre-wrap"><strong>Emergency contact:</strong> {person.emergencyContact ?? "Not recorded"}</p>
        </Card>
      </section>

      <Card title="Next of kin or representative">
        {person.nextOfKinName ? <div className="grid gap-3 text-sm md:grid-cols-2">
          <InfoLine label="Name" value={person.nextOfKinName} />
          <InfoLine label="Relationship" value={person.nextOfKinRelationship ?? "Not recorded"} />
          <InfoLine label="Phone" value={person.nextOfKinPhone ?? "Not recorded"} />
          <InfoLine label="Email" value={person.nextOfKinEmail ?? "Not recorded"} />
          <InfoLine label="Permission to contact" value={person.nextOfKinContactAllowed ? "Recorded" : "Not recorded"} />
          <InfoLine label="Documented authority" value={person.nextOfKinHasAuthority ? "Recorded" : "Not recorded"} />
          <div className="md:col-span-2"><InfoLine label="Authority and limits" value={person.nextOfKinAuthorityDetails ?? "No authority details recorded"} /></div>
        </div> : <p className="text-sm text-slate-500">No next-of-kin or representative details recorded.</p>}
        <p className="mt-4 text-xs text-slate-500">Next-of-kin status alone does not provide legal authority. Check the verified source record before relying on a representative’s decision.</p>
      </Card>

      <Timeline title="Assessments" empty="No assessments have been recorded." entries={assessments} />
      <Timeline title="Reviews and outcomes" empty="No reviews have been recorded." entries={reviews} />
      <Timeline title="Incidents, feedback and other governance records" empty="No other linked records." entries={other} />
    </main>;
  } finally {
    await db.$disconnect();
  }
}

type Entry = { id: string; reference: string; eventDate: Date; title: string; status: string; definition: { key: string; name: string }; staffMember: { firstName: string; lastName: string } | null; _count: { evidenceLinks: number } };

function Timeline({ title, empty, entries }: { title: string; empty: string; entries: Entry[] }) {
  return <section className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="text-lg font-bold">{title}</h2>{entries.length ? <ul className="mt-4 divide-y divide-slate-100">{entries.map((entry) => <li key={entry.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><Link href={`/registers/${entry.definition.key}/${entry.id}`} className="font-bold text-emerald-800 hover:underline">{entry.title}</Link><p className="text-xs text-slate-500">{entry.definition.name} · {entry.reference}{entry.staffMember ? ` · ${entry.staffMember.firstName} ${entry.staffMember.lastName}` : ""}</p></div><p className="text-sm text-slate-600">{date(entry.eventDate)} · {registerStatusLabel(entry.status)} · {entry._count.evidenceLinks} files</p></li>)}</ul> : <p className="mt-3 text-sm text-slate-500">{empty}</p>}</section>;
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="mb-3 font-bold">{title}</h2><div className="space-y-1 text-sm text-slate-700">{children}</div></section>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <article className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-2 font-bold">{value}</p></article>;
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return <p><strong>{label}:</strong> {value}</p>;
}

function date(value: Date | null) {
  return value ? new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "Europe/London" }).format(value) : "Not recorded";
}
