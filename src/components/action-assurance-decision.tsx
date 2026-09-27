import Link from "next/link";
import type { ActionAssuranceCheck } from "@/lib/action-assurance";

type Props = {
  actionId: string;
  closed: boolean;
  canDecide: boolean;
  authorityReason: string;
  canManage: boolean;
  outstanding: ActionAssuranceCheck[];
  linkedEvidence: { linkId: string; id: string; title: string; role: string }[];
  completionAccount: string | null;
  verificationOutcome: string | null;
  effectivenessOutcome: string | null;
  unresolvedDependencies: number;
};

function fixHref(actionId: string, key: string) {
  if (key === "work") return `/actions/${actionId}#current-work`;
  if (key === "completion-evidence") return "#evidence";
  if (key === "dependencies") return "#dependencies";
  if (key === "root-cause") return "#root-cause";
  if (key.includes("verification") || key === "separate-verifier") return "#verification";
  if (key.includes("effectiveness")) return "#effectiveness";
  if (key === "closure-evidence") return "#evidence";
  return null;
}

function decisionLabel(value: string | null) {
  return value ? value.replaceAll("_", " ").toLowerCase() : "Not decided";
}

export function ActionAssuranceDecision({
  actionId, closed, canDecide, canManage, authorityReason, outstanding, linkedEvidence,
  completionAccount, verificationOutcome, effectivenessOutcome, unresolvedDependencies,
}: Props) {
  const blockers = outstanding;
  const needsAttention = blockers.length > 0;
  const status = closed ? "Closed by an authorised decision" : needsAttention ? "Needs attention" : "Ready for management review";
  const tone = closed ? "border-slate-300 bg-slate-50" : needsAttention ? "border-amber-300 bg-amber-50" : "border-emerald-300 bg-emerald-50";

  return <section id="management-assurance-decision" aria-labelledby="management-assurance-label" className={`scroll-mt-6 rounded-2xl border p-5 shadow-sm ${tone}`}>
    <p id="management-assurance-label" className="text-xs font-black uppercase tracking-widest text-slate-600">Management assurance decision</p>
    <h2 id="management-assurance-heading" className="mt-1 text-xl font-black">{status}</h2>
    <p className="mt-2 max-w-3xl text-sm text-slate-700">
      {closed
        ? "The recorded closure decision and earlier stages remain available below. Reopening requires an authorised decision."
        : needsAttention
          ? "Resolve the recorded requirements below, then an authorised person can review the Evidence and decide."
          : "Recorded checks are complete. Review the linked Evidence and make your own closure decision."}
    </p>

    {!closed && blockers.length > 0 ? <div className="mt-4">
      <h3 className="font-bold">What still needs attention?</h3>
      <ul className="mt-2 grid gap-2 md:grid-cols-2">
        {blockers.map((check) => {
          const href = fixHref(actionId, check.key);
          return <li key={check.key} className="rounded-xl border border-amber-200 bg-white p-3 text-sm">
            <strong>{check.label}</strong>
            <p className="mt-1 text-slate-700">{check.reason}</p>
            {href ? <Link href={href} className="mt-2 inline-flex min-h-11 items-center font-bold text-emerald-800 underline underline-offset-2">{`${canManage ? "Open" : "Review"} ${check.label}`}</Link> : <p className="mt-2 font-semibold text-amber-950">Ask a separate authorised closer to make this decision.</p>}
          </li>;
        })}
      </ul>
    </div> : null}

    <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-lg bg-white/80 p-3"><dt className="font-semibold text-slate-600">{completionAccount ? "Work account" : "Completed work"}</dt><dd className="mt-1 break-words">{completionAccount?.trim() || "Not recorded"}</dd></div>
      <div className="rounded-lg bg-white/80 p-3"><dt className="font-semibold text-slate-600">Verification</dt><dd className="mt-1 capitalize">{decisionLabel(verificationOutcome)}</dd></div>
      <div className="rounded-lg bg-white/80 p-3"><dt className="font-semibold text-slate-600">Effectiveness</dt><dd className="mt-1 capitalize">{decisionLabel(effectivenessOutcome)}</dd></div>
      <div className="rounded-lg bg-white/80 p-3"><dt className="font-semibold text-slate-600">Dependencies</dt><dd className="mt-1">{unresolvedDependencies} unresolved dependenc{unresolvedDependencies === 1 ? "y" : "ies"}</dd></div>
    </dl>
    <div className="mt-4 rounded-lg bg-white/80 p-3 text-sm"><h3 className="font-semibold">Linked Evidence to review</h3>{linkedEvidence.length ? <ul className="mt-2 space-y-1">{linkedEvidence.map(item => <li key={item.linkId}><Link href={`/evidence/${item.id}`} className="font-semibold text-emerald-800 underline underline-offset-2">{item.title}</Link> <span className="text-slate-600">· {item.role}</span></li>)}</ul> : <p className="mt-1 text-slate-700">No linked Evidence is available for this decision.</p>}</div>
    {closed ? <Link href="#closure" className="mt-4 inline-flex min-h-11 items-center font-bold text-emerald-800 underline underline-offset-2">Review recorded closure</Link> : null}
    {!closed ? <div className="mt-4">
      {canDecide && !needsAttention ? <Link href="#closure" className="inline-flex min-h-11 items-center rounded-lg bg-emerald-800 px-4 py-2 text-sm font-bold text-white">Review Evidence and decide</Link> : null}
      <p id="decision-authority" className="mt-2 text-sm text-slate-700">{authorityReason}</p>
    </div> : null}
  </section>;
}
