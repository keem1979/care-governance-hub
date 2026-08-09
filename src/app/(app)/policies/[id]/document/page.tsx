import Link from "next/link";
/* eslint-disable @next/next/no-img-element */
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/print-button";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";
import type { GeneratedPolicySection, PolicySource } from "@/lib/policy-catalogue";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false, nocache: true } };

function sections(value: unknown): GeneratedPolicySection[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is GeneratedPolicySection => Boolean(item && typeof item === "object" && "heading" in item && typeof item.heading === "string" && "paragraphs" in item && Array.isArray(item.paragraphs) && item.paragraphs.every((paragraph: unknown) => typeof paragraph === "string")));
}
function sources(value: unknown): PolicySource[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is PolicySource => Boolean(item && typeof item === "object" && "title" in item && typeof item.title === "string" && "url" in item && typeof item.url === "string" && "publisher" in item && typeof item.publisher === "string"));
}

export default async function PolicyDocument({ params }: { params: Promise<{ id: string }> }) {
  const context = await requirePermission(PERMISSIONS.GOVERNANCE_VIEW);
  const { id } = await params;
  const db = createDb();
  const policy = await db.policy.findFirst({ where: { id, organisationId: context.organisation.id }, include: { owner: { select: { name: true } }, approvedBy: { select: { name: true } }, organisation: { select: { id: true, name: true, policyBrandName: true, policyRegistrationNumber: true, policyAddress: true, policyEmail: true, policyPhone: true, policyWebsite: true, policyPrimaryColour: true, policyLogoStorageKey: true } } } }).finally(() => db.$disconnect());
  if (!policy) notFound();
  const content = sections(policy.generatedSections);
  if (content.length === 0) notFound();
  const annex = sources(policy.sourceAnnex);
  const brandName = policy.organisation.policyBrandName?.trim() || policy.organisation.name;
  const colour = policy.organisation.policyPrimaryColour;
  const policyReference = `QCGMS-${policy.id.slice(0, 8).toUpperCase()}`;
  const licenceReference = `ORG-${policy.organisation.id.slice(0, 8).toUpperCase()}`;
  const watermark = `LICENSED TO ${brandName.toUpperCase()} · ${policyReference} · ACCESSED BY ${context.user.name.toUpperCase()}`;
  return <main className="mx-auto max-w-5xl bg-white px-5 py-8 text-slate-950 print:max-w-none print:p-0">
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden"><Link href={`/policies/${id}`} className="text-sm font-bold text-emerald-800">← Policy record</Link><PrintButton policyId={id} /></div>
    <article className="relative isolate overflow-hidden rounded-3xl border border-slate-200 bg-white print:rounded-none print:border-0">
      <div data-testid="licensed-watermark" aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 grid grid-cols-2 gap-x-8 gap-y-24 overflow-hidden px-4 py-16 text-center text-xs font-black tracking-widest text-slate-900 opacity-[0.045] print:fixed print:inset-0">{Array.from({ length: 28 }, (_, index) => <span key={index} className="-rotate-[24deg] whitespace-nowrap">{watermark}</span>)}</div>
      <header data-testid="policy-licensed-header" className="relative z-10 grid gap-6 p-8 text-white md:grid-cols-[160px_1fr] md:items-center md:p-12" style={{ backgroundColor: colour }}>
        <div data-testid="organisation-policy-logo" className="flex h-32 items-center justify-center rounded-2xl bg-white p-4 shadow-sm">{policy.organisation.policyLogoStorageKey ? <img src="/api/settings/policy-branding/logo" alt={`${brandName} logo`} className="max-h-24 max-w-full object-contain" /> : <span className="text-center text-sm font-bold" style={{ color: colour }}>{brandName}</span>}</div>
        <div><p className="text-sm font-bold uppercase tracking-[0.22em] opacity-85">Policy and operating procedure</p><h1 className="mt-4 text-4xl font-bold leading-tight">{policy.title}</h1><p className="mt-5 text-lg font-semibold">{brandName}</p><p className="mt-1 text-sm opacity-85">{[policy.organisation.policyRegistrationNumber, policy.organisation.policyWebsite].filter(Boolean).join(" · ")}</p></div>
      </header>
      <section className="relative z-10 grid gap-4 border-b border-slate-200 bg-slate-50/95 p-6 text-sm md:grid-cols-3 md:p-8">
        <Meta term="Policy reference" value={policyReference} /><Meta term="Policy owner" value={policy.owner.name} /><Meta term="Edition" value={policy.templateVersion ?? "Organisation authored"} /><Meta term="Effective date" value={date(policy.effectiveDate)} /><Meta term="Next review" value={date(policy.nextReviewDate)} /><Meta term="Approval" value={policy.approvedBy ? `${policy.approvalStatus.replaceAll("_", " ")} by ${policy.approvedBy.name}` : policy.approvalStatus.replaceAll("_", " ")} />
      </section>
      {policy.customisationNotes ? <section className="relative z-10 border-b border-amber-200 bg-amber-50/95 p-6 md:p-8"><h2 className="text-lg font-bold text-amber-950">Implementation note</h2><p className="mt-2 leading-7 text-amber-950">{policy.customisationNotes}</p></section> : null}
      <div className="relative z-10 space-y-10 p-7 md:p-12">{content.map((section) => <section key={section.heading} className="break-inside-avoid"><h2 className="border-b pb-3 text-2xl font-bold" style={{ borderColor: colour, color: colour }}>{section.heading}</h2>{section.paragraphs.map((paragraph, index) => <p key={index} className="mt-4 text-[15px] leading-8 text-slate-800">{paragraph}</p>)}</section>)}
        <section className="break-before-page"><h2 className="border-b pb-3 text-2xl font-bold" style={{ borderColor: colour, color: colour }}>Authoritative source annex</h2><p className="mt-4 text-[15px] leading-8 text-slate-800">The policy owner must recheck these sources at review and record any resulting change. Links were last checked on {date(policy.sourceCheckedAt)}.</p>{annex.map((source, index) => <article key={source.url} className="mt-6 break-inside-avoid rounded-xl border border-slate-200 p-5"><h3 className="font-bold">Source {index + 1}: {source.title}</h3><p className="mt-2 text-sm leading-6 text-slate-700">Published by {source.publisher}. {source.relevance}</p><p className="mt-2 break-all text-sm"><a href={source.url} className="font-semibold text-emerald-800 underline">{source.url}</a></p></article>)}</section>
      </div>
      <footer data-testid="atom-licence-footer" className="relative z-10 grid gap-4 border-t border-slate-300 bg-slate-950 p-6 text-xs leading-6 text-slate-200 md:grid-cols-[72px_1fr] md:items-center md:text-left"><img src="/atom-logo.png" alt="ATOM" className="mx-auto h-14 w-14 rounded-xl bg-white object-contain p-1 md:mx-0" /><div><p className="font-bold text-white">© {new Date().getFullYear()} ATOM. All rights reserved.</p><p>This policy is licensed to {brandName} under licence reference {licenceReference}. Access is restricted to authorised licence users. Unauthorised copying, redistribution, publication, resale or commercial use is prohibited.</p><p>Policy {policyReference} · Licensed user {context.user.name} · {context.user.email}</p></div></footer>
    </article>
  </main>;
}
function Meta({ term, value }: { term: string; value: string }) { return <div><p className="text-xs font-bold uppercase tracking-wider text-slate-500">{term}</p><p className="mt-1 font-semibold capitalize">{value}</p></div>; }
function date(value: Date | null) { return value ? new Intl.DateTimeFormat("en-GB", { dateStyle: "long", timeZone: "Europe/London" }).format(value) : "Not set"; }
