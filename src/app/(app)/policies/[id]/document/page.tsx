import Link from "next/link";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/print-button";
import { requirePermission } from "@/lib/auth/dal";
import { createDb } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";
import type { GeneratedPolicySection, PolicySource } from "@/lib/policy-catalogue";

function sections(value: unknown): GeneratedPolicySection[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is GeneratedPolicySection => Boolean(item && typeof item === "object" && "heading" in item && typeof item.heading === "string" && "paragraphs" in item && Array.isArray(item.paragraphs) && item.paragraphs.every((paragraph: unknown) => typeof paragraph === "string")));
}
function sources(value: unknown): PolicySource[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is PolicySource => Boolean(item && typeof item === "object" && "title" in item && typeof item.title === "string" && "url" in item && typeof item.url === "string" && "publisher" in item && typeof item.publisher === "string"));
}

export default async function PremiumPolicyDocument({ params }: { params: Promise<{ id: string }> }) {
  const context = await requirePermission(PERMISSIONS.GOVERNANCE_VIEW);
  const { id } = await params;
  const db = createDb();
  const policy = await db.policy.findFirst({ where: { id, organisationId: context.organisation.id }, include: { owner: { select: { name: true } }, approvedBy: { select: { name: true } }, organisation: { select: { name: true, policyBrandName: true, policyRegistrationNumber: true, policyAddress: true, policyEmail: true, policyPhone: true, policyWebsite: true, policyPrimaryColour: true, policyFooterText: true } } } }).finally(() => db.$disconnect());
  if (!policy) notFound();
  const content = sections(policy.generatedSections);
  if (content.length === 0) notFound();
  const annex = sources(policy.sourceAnnex);
  const brandName = policy.organisation.policyBrandName || policy.organisation.name;
  const colour = policy.organisation.policyPrimaryColour;
  return <main className="mx-auto max-w-5xl bg-white px-5 py-8 text-slate-950 print:max-w-none print:p-0">
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden"><Link href={`/policies/${id}`} className="text-sm font-bold text-emerald-800">← Policy record</Link><PrintButton /></div>
    <article className="overflow-hidden rounded-3xl border border-slate-200 print:rounded-none print:border-0">
      <header className="p-8 text-white md:p-12" style={{ backgroundColor: colour }}>
        <p className="text-sm font-bold uppercase tracking-[0.22em] opacity-80">Controlled policy and procedure</p><h1 className="mt-4 text-4xl font-bold leading-tight">{policy.title}</h1><p className="mt-5 text-lg">{brandName}</p>
      </header>
      <section className="grid gap-4 border-b border-slate-200 bg-slate-50 p-6 text-sm md:grid-cols-3 md:p-8">
        <Meta term="Document status" value={`${policy.status.replaceAll("_", " ")} · ${policy.approvalStatus.replaceAll("_", " ")}`} /><Meta term="Policy owner" value={policy.owner.name} /><Meta term="Template edition" value={policy.templateVersion ?? "Organisation authored"} /><Meta term="Effective date" value={date(policy.effectiveDate)} /><Meta term="Next review" value={date(policy.nextReviewDate)} /><Meta term="Approved by" value={policy.approvedBy?.name ?? "Awaiting local approval"} />
      </section>
      {policy.customisationNotes ? <section className="border-b border-amber-200 bg-amber-50 p-6 md:p-8"><h2 className="text-lg font-bold text-amber-950">Local drafting instructions</h2><p className="mt-2 leading-7 text-amber-950">{policy.customisationNotes}</p></section> : null}
      <div className="space-y-10 p-7 md:p-12">{content.map((section) => <section key={section.heading} className="break-inside-avoid"><h2 className="border-b pb-3 text-2xl font-bold" style={{ borderColor: colour, color: colour }}>{section.heading}</h2>{section.paragraphs.map((paragraph, index) => <p key={index} className="mt-4 text-[15px] leading-8 text-slate-800">{paragraph}</p>)}</section>)}
        <section className="break-before-page"><h2 className="border-b pb-3 text-2xl font-bold" style={{ borderColor: colour, color: colour }}>Authoritative source annex</h2><p className="mt-4 text-[15px] leading-8 text-slate-800">The policy owner must recheck these sources at review and record any resulting change. Links were last checked on {date(policy.sourceCheckedAt)}.</p>{annex.map((source, index) => <article key={source.url} className="mt-6 break-inside-avoid rounded-xl border border-slate-200 p-5"><h3 className="font-bold">Source {index + 1}: {source.title}</h3><p className="mt-2 text-sm leading-6 text-slate-700">Published by {source.publisher}. {source.relevance}</p><p className="mt-2 break-all text-sm"><a href={source.url} className="font-semibold text-emerald-800 underline">{source.url}</a></p></article>)}</section>
      </div>
      <footer className="border-t border-slate-200 bg-slate-50 p-6 text-center text-xs leading-6 text-slate-600">{policy.organisation.policyFooterText || `${brandName} · Controlled document · Uncontrolled when printed`}<br />{[policy.organisation.policyRegistrationNumber, policy.organisation.policyEmail, policy.organisation.policyPhone, policy.organisation.policyWebsite, policy.organisation.policyAddress].filter(Boolean).join(" · ")}</footer>
    </article>
  </main>;
}
function Meta({ term, value }: { term: string; value: string }) { return <div><p className="text-xs font-bold uppercase tracking-wider text-slate-500">{term}</p><p className="mt-1 font-semibold capitalize">{value}</p></div>; }
function date(value: Date | null) { return value ? new Intl.DateTimeFormat("en-GB", { dateStyle: "long", timeZone: "Europe/London" }).format(value) : "Not set"; }
