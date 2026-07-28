import Link from "next/link";
import { CheckCircle2, CircleDashed, ShieldCheck } from "lucide-react";
import { requirePermission } from "@/lib/auth/dal";
import { PERMISSIONS } from "@/lib/permissions";

const controls = [
  ["Role-based and location-based access", "ACTIVE", "/settings"],
  ["Read-only access and licence controls", "ACTIVE", "/settings"],
  ["Application audit trail", "ACTIVE", "/activity"],
  ["Private evidence file storage", "ACTIVE", "/evidence"],
  ["Data-breach and continuity registers", "ACTIVE", "/registers"],
  ["Multi-factor authentication", "HOST_CONFIGURATION", "/settings"],
  ["Device management", "HOST_CONFIGURATION", "/settings"],
  ["Backup restoration testing", "HOST_CONFIGURATION", "/registers/business-continuity"],
  ["Retention schedule approval", "ORGANISATION_ACTION", "/policies"],
  ["DSPT annual assessment", "ORGANISATION_ACTION", "/inspection"],
  ["Cyber Essentials evidence", "ORGANISATION_ACTION", "/evidence"],
] as const;

const integrations = [
  ["Nourish", "Care plans, incidents, audits and service-delivery KPIs"],
  ["CareLens", "Care monitoring and operational assurance data"],
  ["CareNexus", "Care operations and selected compliance measures"],
  ["Microsoft 365", "Documents, identity, email reminders and collaboration"],
  ["Payroll and HR", "Starter, leaver, absence and workforce data"],
  ["Training platforms", "Course completion, expiry and competency data"],
  ["Finance systems", "Contract and financial assurance measures"],
] as const;

export default async function AssurancePage() {
  await requirePermission(PERMISSIONS.ORGANISATION_MANAGE);
  return (
    <main className="space-y-7">
      <header>
        <p className="text-sm font-bold uppercase tracking-widest text-emerald-700">
          Organisational assurance
        </p>
        <h1 className="text-3xl font-bold">Security & Integration Readiness</h1>
        <p className="mt-1 max-w-3xl text-slate-600">
          Distinguish controls already enforced by the Hub from controls that
          must be configured with your cloud, devices, policies and assurance programmes.
        </p>
      </header>
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-bold">Security control position</h2>
        <div className="mt-4 divide-y divide-slate-100">
          {controls.map(([name, state, href]) => (
            <Link key={name} href={href} className="flex items-center justify-between gap-4 py-3">
              <span className="text-sm font-medium">{name}</span>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                state === "ACTIVE" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"
              }`}>
                {state === "ACTIVE" ? <CheckCircle2 size={13} /> : <CircleDashed size={13} />}
                {state === "ACTIVE" ? "Active" : state === "HOST_CONFIGURATION" ? "Configure with host" : "Organisation action"}
              </span>
            </Link>
          ))}
        </div>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-start gap-3">
          <ShieldCheck className="text-emerald-700" size={22} />
          <div>
            <h2 className="text-lg font-bold">Integration catalogue</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              These are approved connection targets, not active data feeds.
              Each supplier requires a data-sharing decision, API access,
              field mapping, security review and a named owner before connection.
            </p>
          </div>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {integrations.map(([name, purpose]) => (
            <article key={name} className="rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-bold">{name}</h3>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-600">
                  Not connected
                </span>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600">{purpose}</p>
            </article>
          ))}
        </div>
      </section>
      <p className="text-xs leading-5 text-slate-500">
        This page is an internal readiness view, not certification of UK GDPR,
        DSPT, Cyber Essentials or regulatory compliance.
      </p>
    </main>
  );
}
