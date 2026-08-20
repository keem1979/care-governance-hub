import Link from "next/link";
import { OrganisationDocumentBrand } from "@/components/organisation-document-brand";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { EXTERNAL_INTEGRATION_CANDIDATES, INTEGRATION_APPROVAL_GATES, NATIVE_DATA_FLOWS } from "@/lib/integrations";
import { PERMISSIONS } from "@/lib/permissions";

const securityControls = [
  ["Role and location-based access", "Active in QCGMS", "/settings"],
  ["Read-only access and licence controls", "Active in QCGMS", "/settings"],
  ["Application Audit Trail", "Active in QCGMS", "/activity"],
  ["Private evidence-file storage", "Active in QCGMS", "/evidence"],
  ["Mandatory account MFA and recovery codes", "Active in QCGMS", "/security"],
  ["Durable login abuse protection", "Active in QCGMS", "/security"],
  ["Browser and cross-site request protection", "Active in QCGMS", "/security"],
  ["Backup restoration exercise", "Release evidence required", "/registers/business-continuity"],
  ["Independent penetration test", "Release evidence required", "/inspection"],
  ["DPIA, DSPT and clinical-safety acceptance", "Release evidence required", "/inspection"],
] as const;

export default async function AssurancePage() {
  const context = await requirePermission(PERMISSIONS.ORGANISATION_MANAGE);
  const highRisk = EXTERNAL_INTEGRATION_CANDIDATES.filter((item) => item.risk === "High").length;
  const connectionCounts = await loadConnectionCounts(context.organisation.id);
  return <main className="space-y-8">
    <header className="rounded-3xl bg-slate-900 p-7 text-white shadow-sm"><OrganisationDocumentBrand name={context.organisation.name} hasLogo={Boolean(context.organisation.policyLogoStorageKey)}/><p className="mt-6 text-xs font-bold uppercase tracking-[.2em] text-emerald-300">Data exchange governance</p><h1 className="mt-2 text-3xl font-bold">Security and Integration Assurance</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">See which data flows operate inside QCGMS, which external connections are only candidates, and the controls required before any supplier data is exchanged.</p><Link href="/connected-governance" className="mt-5 inline-block rounded-xl bg-emerald-500 px-4 py-2 text-sm font-black text-slate-950">Open Connected Governance</Link></header>

    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5"><Stat label="Active native flows" value={NATIVE_DATA_FLOWS.length} tone="green"/><Stat label="Approved connections" value={connectionCounts.active} tone="green"/><Stat label="Connections in review" value={connectionCounts.review}/><Stat label="Degraded / failed" value={connectionCounts.failed} tone="amber"/><Stat label="High-risk candidates" value={highRisk} tone="amber"/></section>

    <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950"><strong>Assurance conclusion:</strong> application MFA, durable sign-in protection, session control and browser protections are active in this build. Independent penetration testing, approved supplier terms, customer DPIA, restore evidence and clinical-safety acceptance remain live-release gates. A QCGMS connection marked active records internal approval gates; it is not independent supplier certification. Candidate names below are discovery options, not approval or connection status.</section>

    <section className="space-y-3"><div><p className="text-xs font-bold uppercase tracking-widest text-emerald-700">Operating now</p><h2 className="mt-1 text-2xl font-bold">Native QCGMS data flows</h2><p className="mt-1 text-sm text-slate-600">These flows happen within the authorised organisation workspace; they are not external supplier integrations.</p></div><div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className={cell}>Data flow</th><th className={cell}>Direction</th><th className={cell}>Information</th><th className={cell}>Control</th><th className={cell}>Status</th></tr></thead><tbody className="divide-y divide-slate-100">{NATIVE_DATA_FLOWS.map((item) => <tr key={item.name} className="align-top"><td className={cell}><Link href={item.href} className="font-bold text-emerald-800 underline">{item.name}</Link></td><td className={cell}>{item.direction}</td><td className={cell}>{item.data}</td><td className={cell}>{item.control}</td><td className={cell}><Badge tone="green">ACTIVE</Badge></td></tr>)}</tbody></table></div></section>

    <section className="space-y-3"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-widest text-emerald-700">Not connected</p><h2 className="mt-1 text-2xl font-bold">External integration candidates</h2><p className="mt-1 max-w-3xl text-sm text-slate-600">Potential connections for discovery only. No supplier data should be sent or credentials entered until every approval gate is complete.</p></div><Link href="/api/assurance/integrations/export" className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold">Export review schedule</Link></div><div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full min-w-[950px] text-left text-xs"><thead className="bg-slate-50 uppercase tracking-wide text-slate-500"><tr><th className={cell}>Candidate</th><th className={cell}>Potential purpose</th><th className={cell}>Direction</th><th className={cell}>Data classification</th><th className={cell}>Inherent risk</th><th className={cell}>Required next action</th><th className={cell}>Status</th></tr></thead><tbody className="divide-y divide-slate-100">{EXTERNAL_INTEGRATION_CANDIDATES.map((item) => <tr key={item.name} className="align-top"><td className={`${cell} font-bold`}>{item.name}</td><td className={cell}>{item.purpose}</td><td className={cell}>{item.direction}</td><td className={cell}>{item.dataClass}</td><td className={cell}><Badge tone={item.risk === "High" ? "red" : "amber"}>{item.risk}</Badge></td><td className={cell}>{item.ownerAction}</td><td className={cell}><Badge>NOT CONNECTED</Badge></td></tr>)}</tbody></table></div></div></section>

    <section className="grid gap-5 xl:grid-cols-[1.25fr_.75fr]"><div className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="text-xl font-bold">Mandatory connection approval gates</h2><p className="mt-1 text-sm text-slate-600">Use this as the minimum go-live checklist. Retain completed evidence in the Evidence Library and decisions in governance minutes.</p><table className="mt-4 w-full border-collapse text-sm"><thead><tr className="bg-slate-100"><th className={borderCell}>Complete</th><th className={`${borderCell} text-left`}>Gate</th><th className={`${borderCell} text-left`}>Evidence required</th></tr></thead><tbody>{INTEGRATION_APPROVAL_GATES.map(([gate, evidence]) => <tr key={gate}><td className={`${borderCell} w-20 text-center text-lg`}>☐</td><th className={`${borderCell} w-44 text-left`}>{gate}</th><td className={borderCell}>{evidence}</td></tr>)}</tbody></table></div><div className="space-y-5"><section className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="text-xl font-bold">Security control position</h2><div className="mt-3 divide-y divide-slate-100">{securityControls.map(([name, state, href]) => <Link href={href} key={name} className="flex items-center justify-between gap-4 py-3 text-sm"><span className="font-medium">{name}</span><span className={state.startsWith("Active") ? "text-xs font-bold text-emerald-700" : "text-right text-xs font-bold text-amber-800"}>{state}</span></Link>)}</div></section><section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5"><h2 className="font-bold text-emerald-950">Safe implementation sequence</h2><ol className="mt-3 space-y-2 text-sm text-emerald-950"><li>1. Approve the need and minimum dataset</li><li>2. Complete information-governance and supplier review</li><li>3. Design authentication, mapping and failure handling</li><li>4. Test with synthetic or minimised data</li><li>5. Approve, monitor, reconcile and review</li></ol></section></div></section>

    <p className="text-xs leading-5 text-slate-500">This is an internal readiness and assurance view. It is not independent security certification, penetration-test evidence, supplier approval, a signed customer DPIA, legal advice, DSPT status, DCB0129 acceptance or Cyber Essentials certification.</p>
  </main>;
}

function Stat({ label, value, tone = "slate" }: { label: string; value: number; tone?: "slate" | "green" | "amber" }) { const styles = { slate: "border-slate-200 bg-white", green: "border-emerald-200 bg-emerald-50", amber: "border-amber-200 bg-amber-50" }; return <div className={`rounded-2xl border p-5 ${styles[tone]}`}><p className="text-xs font-semibold text-slate-600">{label}</p><p className="mt-1 text-3xl font-black">{value}</p></div>; }
function Badge({ children, tone = "slate" }: { children: React.ReactNode; tone?: "slate" | "green" | "amber" | "red" }) { const styles = { slate: "bg-slate-100 text-slate-700", green: "bg-emerald-100 text-emerald-800", amber: "bg-amber-100 text-amber-900", red: "bg-red-100 text-red-800" }; return <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-bold ${styles[tone]}`}>{children}</span>; }
const cell = "px-4 py-4";
const borderCell = "border border-slate-200 p-3 align-top";

async function loadConnectionCounts(organisationId: string) {
  const db = createDb();
  try {
    const [active, review, failed] = await Promise.all([
      db.integrationConnection.count({ where: { organisationId, status: "ACTIVE", archivedAt: null } }),
      db.integrationConnection.count({ where: { organisationId, status: { in: ["DRAFT", "REVIEW_REQUIRED"] }, archivedAt: null } }),
      db.integrationConnection.count({ where: { organisationId, archivedAt: null, OR: [{ status: "ERROR" }, { health: { in: ["DEGRADED", "FAILED"] } }] } }),
    ]);
    return { active, review, failed };
  } finally {
    await db.$disconnect();
  }
}
