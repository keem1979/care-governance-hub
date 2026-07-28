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
    title: "Care-plan reviews",
    detail: "Review dates, involvement, agreed changes and outcomes.",
    href: "/registers/care-plan-reviews",
    icon: HeartHandshake,
  },
  {
    title: "Person-level risk assessments",
    detail: "Renewals, changes in risk and updated controls.",
    href: "/registers/risk-assessment-reviews",
    icon: ShieldCheck,
  },
  {
    title: "Medication and MAR audits",
    detail: "Sampling, omissions, stock variances, findings and actions.",
    href: "/registers/mar-audits",
    icon: Pill,
  },
  {
    title: "Delegated healthcare tasks",
    detail: "Delegation, clinical instructions, authorisation and competency.",
    href: "/registers/delegated-healthcare",
    icon: HeartPulse,
  },
  {
    title: "Service-user outcomes",
    detail: "Goals, progress, people’s views and review dates.",
    href: "/registers/service-user-outcomes",
    icon: ClipboardCheck,
  },
  {
    title: "Satisfaction surveys",
    detail: "Scores, themes and ‘you said, we did’ improvement.",
    href: "/registers/satisfaction-surveys",
    icon: HeartHandshake,
  },
  {
    title: "Business continuity",
    detail: "Plans, exercises, disruptions, recovery and lessons learned.",
    href: "/registers/business-continuity",
    icon: ShieldCheck,
  },
  {
    title: "Commissioner contracts",
    detail: "Submission dates, performance issues and commissioner actions.",
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

