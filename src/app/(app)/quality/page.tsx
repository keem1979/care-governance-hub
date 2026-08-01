import Link from "next/link";
import {
  ArrowRight,
  ClipboardCheck,
  HeartHandshake,
  HeartPulse,
  Pill,
  ShieldCheck,
} from "lucide-react";
import { requirePermission } from "@/lib/auth/dal";
import { PERMISSIONS } from "@/lib/permissions";

const areas = [
  {
    title: "Complete an assessment",
    detail: "Start with initial needs and decision-specific consent, then choose only the specialist assessments indicated by need or risk.",
    href: "/assessments",
    icon: ShieldCheck,
  },
  {
    title: "Review a person’s care plan",
    detail: "Record who took part, what changed, agreed outcomes and the next review date.",
    href: "/registers/care-plan-reviews",
    icon: HeartHandshake,
  },
  {
    title: "Review a person’s risk assessment",
    detail: "Name the risk being reviewed, record what changed and confirm whether controls were updated.",
    href: "/registers/risk-assessment-reviews",
    icon: ShieldCheck,
  },
  {
    title: "Complete a medication and MAR audit",
    detail: "Record the sample period, records checked, omissions, stock variances, score and corrective action.",
    href: "/registers/mar-audits",
    icon: Pill,
  },
  {
    title: "Record a delegated healthcare task",
    detail: "Capture the delegating professional, current clinical instructions, authorised staff and competency review.",
    href: "/registers/delegated-healthcare",
    icon: HeartPulse,
  },
  {
    title: "Review a person’s outcome",
    detail: "Record the agreed goal, evidence of progress, the person’s view and the next review.",
    href: "/registers/service-user-outcomes",
    icon: ClipboardCheck,
  },
  {
    title: "Record satisfaction survey results",
    detail: "Enter response numbers, scores, themes and the improvement communicated back to people.",
    href: "/registers/satisfaction-surveys",
    icon: HeartHandshake,
  },
  {
    title: "Record a continuity exercise or disruption",
    detail: "Describe the scenario, whether care continued, recovery time, lessons and the next exercise.",
    href: "/registers/business-continuity",
    icon: ShieldCheck,
  },
  {
    title: "Track a commissioner requirement",
    detail: "Record the contract, reporting period, submission dates, performance issue, feedback and required action.",
    href: "/registers/commissioner-contracts",
    icon: ClipboardCheck,
  },
] as const;

export default async function CareQualityPage() {
  await requirePermission(PERMISSIONS.GOVERNANCE_VIEW);
  return (
    <main className="space-y-7">
      <header>
        <p className="text-sm font-bold uppercase tracking-widest text-emerald-700">
          Quality operations
        </p>
        <h1 className="text-3xl font-bold">Care Quality & Contract Assurance</h1>
        <p className="mt-1 max-w-3xl text-slate-600">
          Monitor care reviews, medication assurance, delegated healthcare,
          outcomes, feedback, continuity and commissioner obligations.
        </p>
      </header>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {areas.map(({ title, detail, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-emerald-400"
          >
            <div className="flex items-start justify-between gap-4">
              <span className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
                <Icon size={20} />
              </span>
              <ArrowRight className="text-slate-300 group-hover:text-emerald-700" size={18} />
            </div>
            <h2 className="mt-4 font-bold group-hover:text-emerald-800">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{detail}</p>
            <p className="mt-4 text-sm font-semibold text-emerald-700">Open records and add entry</p>
          </Link>
        ))}
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="font-bold">Already connected elsewhere in the Hub</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Complaints, compliments, safeguarding, incidents, accidents,
          medicines errors, falls, missed visits and CQC notifications remain
          in Registers. Organisation-level risks remain in Risk Register, and
          improvement work remains in Action Tracker so records are not duplicated.
        </p>
      </section>
    </main>
  );
}
